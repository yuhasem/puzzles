package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"puzzles/puzzle"
	"time"

	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var host = flag.String("host", "localhost", "ip address to bind on")
var raw = flag.Bool("raw", false, "Whether to server raw or minified versions of the javascript")

func main() {
	flag.Parse()
	// Set up loggers.
	nowStr := time.Now().Format("060102_150405")
	logFile, err := os.Create(fmt.Sprintf("puzzle_%s.log", nowStr))
	if err != nil {
		fmt.Println("error creating a log file: %v", err)
		return
	}
	// TODO: provide a way to set logging level.
	logger := slog.New(slog.NewTextHandler(logFile, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	// Set up monitoring.
	monMux := http.ServeMux{}
	monServer := http.Server{
		Handler: &monMux,
	}
	monL, err := net.Listen("tcp", fmt.Sprintf("%s:2113", *host))
	if err != nil {
		slog.Error(fmt.Sprintf("setting up monitoring port: %s", err))
	}
	monMux.Handle("/metrics", promhttp.Handler())
	go monServer.Serve(monL)
	defer monServer.Shutdown(context.Background())

	// Set up main server.
	server := http.Server{}
	l, err := net.Listen("tcp", fmt.Sprintf("%s:3722", *host))
	if err != nil {
		slog.Error(fmt.Sprintf("setting up main port: %s", err))
		return
	}
	http.Handle("/static/", puzzle.NewStaticHandler(*raw))
	p, err := puzzle.NewPuzzleHandler()
	if err != nil {
		slog.Error(fmt.Sprintf("creating puzzle handler: %s", err))
		return
	}
	http.Handle("/puzzles/", p)

	err = server.Serve(l)
	if err != nil {
		slog.Error(fmt.Sprintf("starting main server: %v", err))
	}
	defer server.Shutdown(context.Background())
}
