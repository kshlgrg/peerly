# Build stage
FROM rust:1.80-slim as builder

WORKDIR /usr/src/peerly

# Pre-cache dependencies to speed up subsequent builds
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src

# Copy actual source code
COPY src ./src
RUN touch src/main.rs && cargo build --release

# Minimal runtime stage (~20MB RAM idle)
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /usr/src/peerly/target/release/peerly-api-rust /app/peerly-api-rust

ENV PORT=8000
EXPOSE 8000

CMD ["/app/peerly-api-rust"]
