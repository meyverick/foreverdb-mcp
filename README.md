# Codebase Submodule

This directory is the single codebase submodule (Tier 2) containing all application source code, domain packages, and native toolchains.

## Execution Context

All build, test, lint, and packaging commands execute with working directory strictly inside this module.

## Pre-Push Verification

This module must provide `./scripts/check.sh` implementing the native 6-slot verification lane:
```bash
./scripts/check.sh [--quick]
```
