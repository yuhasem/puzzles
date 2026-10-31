package puzzle

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"
	"text/template"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var puzzleRequests = promauto.NewCounterVec(prometheus.CounterOpts{
	Name: "puzzle_requests",
	Help: "Number of http requests handled by the /puzzle path",
}, []string{"code"})

type puzzleHandler struct {
	t   *template.Template
	cwd string
}

func NewPuzzleHandler() (*puzzleHandler, error) {
	// Read the template.
	cwd, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("error getting working directory: %w", err)
	}
	fullPath := cwd + "/templates/puzzle.html"
	return &puzzleHandler{
		t:   template.Must(template.New("puzzle").ParseFiles(fullPath)),
		cwd: cwd,
	}, nil
}

type Data struct {
	Chain string
}

func (h *puzzleHandler) ServeHTTP(out http.ResponseWriter, in *http.Request) {
	var code int = 200
	defer func() {
		puzzleRequests.WithLabelValues(strconv.Itoa(code)).Inc()
		out.WriteHeader(code)
	}()
	slog.Debug(fmt.Sprintf("%v requested\n", in.URL))
	paths := strings.Split(in.URL.Path, "/")
	if len(paths) < 4 {
		slog.Debug("request too short", "in-url", in.URL)
		code = 404
		return
	}
	switch paths[2] {
	case "chain":
		var err error
		code, err = h.handleChain(paths[3:], out)
		if err != nil {
			slog.Warn(fmt.Sprintf("%s\n", err), "in-url", in.URL)
			return
		}
	case "mines":
		var err error
		code, err = h.handleMines(paths[3:], out)
		if err != nil {
			slog.Warn(fmt.Sprintf("%s\n", err), "in-url", in.URL)
			return
		}
	default:
		slog.Debug(fmt.Sprintf("unown second path %s", paths[1]), "in-url", in.URL)
		code = 404
		return
	}
	out.Header().Set("Access-Control-Allow-Origin", "*")
	out.Header().Set("Content-Type", "text/html")
}

func (h *puzzleHandler) handleChain(paths []string, out http.ResponseWriter) (int, error) {
	if len(paths) != 1 {
		return 404, fmt.Errorf("Unexpected path structure %v", paths)
	}
	switch paths[0] {
	case "1":
		return h.puzzleFromFile("/static/chain/1.js", out)
	case "2":
		// TODO: move to static, or least make it consistent between the 2.
		return h.puzzleFromFile("/raw/chain/2.js", out)
	case "3":
		return h.puzzleFromFile("/raw/chain/3.js", out)
	default:
		return 404, fmt.Errorf("Not a puzzle: %s", paths[0])
	}
	return 200, nil
}

func (h *puzzleHandler) handleMines(paths []string, out http.ResponseWriter) (int, error) {
	if len(paths) != 1 {
		return 404, fmt.Errorf("Unexpected path structure %v", paths)
	}
	switch paths[0] {
	case "1":
		return h.puzzleFromFile("/static/mines/1.js", out)
	case "2":
		return h.puzzleFromFile("/static/mines/2.js", out)
	case "3":
		return h.puzzleFromFile("/static/mines/3.js", out)
	case "4":
		return h.puzzleFromFile("/static/mines/4.js", out)
	case "5":
		return h.puzzleFromFile("/static/mines/5.js", out)
	case "6":
		return h.puzzleFromFile("/static/mines/6.js", out)
	}

	return 200, nil
}

func (h *puzzleHandler) puzzleFromFile(file string, out http.ResponseWriter) (int, error) {
	data, err := os.ReadFile(path.Join(h.cwd, file))
	if err != nil {
		return 500, fmt.Errorf("reading puzzle data: %w", err)
	}
	d := Data{Chain: fmt.Sprintf("%s", data)}
	err = h.t.ExecuteTemplate(out, "puzzle.html", d)
	if err != nil {
		return 500, fmt.Errorf("assigning chain to template: %w", err)
	}
	return 200, nil
}
