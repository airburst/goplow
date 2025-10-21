package static

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
)

//go:embed index.html assets/*
var staticFiles embed.FS

// GetHTMLContent returns the embedded HTML content
func GetHTMLContent() string {
	content, err := staticFiles.ReadFile("index.html")
	if err != nil {
		log.Printf("Error reading index.html: %v\n", err)
		return "<html><body>Error loading page</body></html>"
	}
	return string(content)
}

// GetStaticFS returns the embedded filesystem for serving static files
func GetStaticFS() http.FileSystem {
	sub, err := fs.Sub(staticFiles, ".")
	if err != nil {
		log.Fatalf("Error creating static filesystem: %v\n", err)
	}
	return http.FS(sub)
}

// RegisterStaticRoutes registers static file routes
func RegisterStaticRoutes(mux *http.ServeMux) {
	// Create an assets subdirectory filesystem for the /assets route
	assetsFS, err := fs.Sub(staticFiles, "assets")
	if err != nil {
		log.Printf("Error creating assets filesystem: %v\n", err)
	} else {
		mux.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.FS(assetsFS))))
	}

	// Keep the old /static/ path for backward compatibility
	staticFS := GetStaticFS()
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(staticFS)))
} // GetCSSContent returns the embedded CSS content from assets
func GetCSSContent() string {
	content, err := staticFiles.ReadFile("assets/index-DeWabpl-.css")
	if err != nil {
		log.Printf("Error reading CSS file: %v\n", err)
		return ""
	}
	return string(content)
}

// GetJSContent returns the embedded JavaScript content from assets
func GetJSContent() string {
	content, err := staticFiles.ReadFile("assets/index-BEHE00xL.js")
	if err != nil {
		log.Printf("Error reading JS file: %v\n", err)
		return ""
	}
	return string(content)
}

// ListStaticFiles lists all embedded static files
func ListStaticFiles() {
	fs.WalkDir(staticFiles, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() {
			fmt.Printf("Embedded file: %s\n", path)
		}
		return nil
	})
}
