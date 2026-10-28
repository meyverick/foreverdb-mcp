//! Minimal HTTP stub for tests: counts requests, tracks peak concurrency, and
//! replays a scripted sequence of replies.

use std::collections::VecDeque;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

#[derive(Clone, Debug)]
pub struct Reply {
    pub status: u16,
    pub retry_after: Option<u64>,
    pub body: String,
    pub delay: Duration,
}

impl Reply {
    pub fn json(body: &str) -> Self {
        Self {
            status: 200,
            retry_after: None,
            body: body.to_owned(),
            delay: Duration::ZERO,
        }
    }

    pub fn with_status(mut self, status: u16) -> Self {
        self.status = status;
        self
    }

    pub fn with_delay(mut self, delay: Duration) -> Self {
        self.delay = delay;
        self
    }
}

pub struct Stub {
    pub base: String,
    hits: Arc<AtomicUsize>,
    peak: Arc<AtomicUsize>,
    task: tokio::task::JoinHandle<()>,
}

impl Stub {
    pub async fn start(script: Vec<Reply>) -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").await.expect("stub binds");
        let address = listener.local_addr().expect("stub address");
        let script = Arc::new(Mutex::new(VecDeque::from(script)));
        let hits = Arc::new(AtomicUsize::new(0));
        let peak = Arc::new(AtomicUsize::new(0));
        let in_flight = Arc::new(AtomicUsize::new(0));

        let task = tokio::spawn({
            let hits = Arc::clone(&hits);
            let peak = Arc::clone(&peak);
            let in_flight = Arc::clone(&in_flight);
            async move {
                loop {
                    let Ok((mut socket, _)) = listener.accept().await else {
                        return;
                    };
                    let script = Arc::clone(&script);
                    let hits = Arc::clone(&hits);
                    let peak = Arc::clone(&peak);
                    let in_flight = Arc::clone(&in_flight);
                    tokio::spawn(async move {
                        let mut buffer = Vec::new();
                        while read_request(&mut socket, &mut buffer).await {
                            let current = in_flight.fetch_add(1, Ordering::SeqCst) + 1;
                            peak.fetch_max(current, Ordering::SeqCst);
                            hits.fetch_add(1, Ordering::SeqCst);

                            let reply = next_reply(&script);
                            if !reply.delay.is_zero() {
                                tokio::time::sleep(reply.delay).await;
                            }
                            in_flight.fetch_sub(1, Ordering::SeqCst);
                            if write_reply(&mut socket, &reply).await.is_err() {
                                return;
                            }
                        }
                    });
                }
            }
        });

        Self {
            base: format!("http://{address}/api/v1"),
            hits,
            peak,
            task,
        }
    }

    pub fn hits(&self) -> usize {
        self.hits.load(Ordering::SeqCst)
    }

    pub fn peak(&self) -> usize {
        self.peak.load(Ordering::SeqCst)
    }
}

impl Drop for Stub {
    fn drop(&mut self) {
        self.task.abort();
    }
}

fn next_reply(script: &Arc<Mutex<VecDeque<Reply>>>) -> Reply {
    let mut guard = script.lock().expect("stub script mutex poisoned");
    if guard.len() > 1 {
        guard.pop_front().expect("script is not empty")
    } else {
        guard.front().cloned().expect("script is never empty")
    }
}

async fn read_request(socket: &mut tokio::net::TcpStream, buffer: &mut Vec<u8>) -> bool {
    loop {
        if buffer.windows(4).any(|window| window == b"\r\n\r\n") {
            buffer.clear();
            return true;
        }
        let mut chunk = [0_u8; 1024];
        match socket.read(&mut chunk).await {
            Ok(0) | Err(_) => return false,
            Ok(read) => buffer.extend_from_slice(&chunk[..read]),
        }
    }
}

async fn write_reply(socket: &mut tokio::net::TcpStream, reply: &Reply) -> std::io::Result<()> {
    let mut head = format!(
        "HTTP/1.1 {} Stub\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: keep-alive\r\n",
        reply.status,
        reply.body.len()
    );
    if let Some(seconds) = reply.retry_after {
        head.push_str(&format!("Retry-After: {seconds}\r\n"));
    }
    head.push_str("\r\n");
    socket.write_all(head.as_bytes()).await?;
    socket.write_all(reply.body.as_bytes()).await?;
    socket.flush().await
}
