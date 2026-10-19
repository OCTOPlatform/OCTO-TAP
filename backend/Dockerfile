FROM golang:1.26-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o server cmd/server/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -o migrate cmd/migrate/main.go

FROM alpine:3.19

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata

COPY --from=builder /app/server .
COPY --from=builder /app/migrate .
COPY --from=builder /app/migrations ./migrations

EXPOSE 8080

CMD ["./server"]
