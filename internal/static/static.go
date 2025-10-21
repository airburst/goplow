package static

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
)

//go:embed index.html assets/*
var staticFiles embed.FS

var devMode = os.Getenv("GOPLOW_DEV_MODE") == "true"
var devAssetsPath = os.Getenv("GOPLOW_DEV_ASSETS_PATH")

// GetHTMLContent returns the embedded HTML content or dev content
func GetHTMLContent() string {
	if devMode && devAssetsPath != "" {
		content, err := os.ReadFile(filepath.Join(devAssetsPath, "index.html"))
		if err != nil {
			log.Printf("Error reading dev index.html: %v\n", err)
			return getEmbeddedHTMLContent()
		}
		return string(content)
	}
	return getEmbeddedHTMLContent()
}

func getEmbeddedHTMLContent() string {
	content, err := staticFiles.ReadFile("index.html")
	if err != nil {
		log.Printf("Error reading embedded index.html: %v\n", err)
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
	// In dev mode, serve assets from the dev folder
	if devMode && devAssetsPath != "" {
		log.Printf("DEV MODE: Serving assets from %s\n", devAssetsPath)
		devAssetsDir := filepath.Join(devAssetsPath, "assets")
		mux.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir(devAssetsDir))))
	} else {
		// Production mode: Create an assets subdirectory filesystem for the /assets route
		assetsFS, err := fs.Sub(staticFiles, "assets")
		if err != nil {
			log.Printf("Error creating assets filesystem: %v\n", err)
		} else {
			mux.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.FS(assetsFS))))
		}
	}

	// Keep the old /static/ path for backward compatibility
	staticFS := GetStaticFS()
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(staticFS)))
}

// GetCSSContent returns the embedded CSS content from assets
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
