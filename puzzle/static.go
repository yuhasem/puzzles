package puzzle

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path"
	"strings"
)

type staticHandler struct {
	pathBase string
}

func NewStaticHandler(raw bool) staticHandler {
	p := "/static/"
	if raw {
		p = "/raw/"
	}
	return staticHandler{
		pathBase: p,
	}
}

func (h staticHandler) ServeHTTP(out http.ResponseWriter, in *http.Request) {
	slog.Debug(fmt.Sprintf("%v requested\n", in.URL))
	// TODO: should we provide a more specific CORS header?
	out.Header().Set("Access-Control-Allow-Origin", "*")
	cwd, err := os.Getwd()
	if err != nil {
		slog.Warn(fmt.Sprintf("error getting working directory: %v\n", err))
		out.WriteHeader(500)
		return
	}
	fullPath := path.Join(cwd, strings.Replace(in.URL.Path, "/static/", h.pathBase, 1))
	data, err := os.ReadFile(fullPath)
	if err != nil {
		slog.Warn(fmt.Sprintf("retrieving file: %v\n", err))
		out.WriteHeader(500)
		return
	}
	parts := strings.Split(in.URL.Path, ".")
	extension := parts[len(parts)-1]
	switch extension {
	case "js", "mjs":
		out.Header().Set("Content-Type", "text/javascript")
	case "htm", "html":
		out.Header().Set("Content-Type", "text/html")
	case "css":
		out.Header().Set("Content-Type", "text/css")
	default:
		slog.Warn(fmt.Sprintf("no content type for extension: %s", extension))
		out.WriteHeader(500)
		return
	}
	if _, err := out.Write(data); err != nil {
		slog.Error(fmt.Sprintf("error writing to output: %v\n", err))
		out.WriteHeader(500)
		return
	}
}
