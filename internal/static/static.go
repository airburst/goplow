package static

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

//go:embed index.html assets/*
var staticFiles embed.FS

//go:embed schemas
var schemasFS embed.FS

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

		// In dev mode, also serve schemas from the static/schemas directory
		schemasDir := filepath.Join(devAssetsPath, "..", "static", "schemas")
		mux.HandleFunc("/schemas/", func(w http.ResponseWriter, r *http.Request) {
			ServeDevSchemas(w, r, schemasDir)
		})
		mux.HandleFunc("/schemas", func(w http.ResponseWriter, r *http.Request) {
			ListDevSchemas(w, r, schemasDir)
		})
	} else {
		// Production mode: Create an assets subdirectory filesystem for the /assets route
		assetsFS, err := fs.Sub(staticFiles, "assets")
		if err != nil {
			log.Printf("Error creating assets filesystem: %v\n", err)
		} else {
			mux.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.FS(assetsFS))))
		}

		// Serve embedded schemas
		mux.HandleFunc("/schemas/", ServeEmbeddedSchemas)
		mux.HandleFunc("/schemas", ListEmbeddedSchemas)
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

// ServeEmbeddedSchemas serves schema files from embedded filesystem
func ServeEmbeddedSchemas(w http.ResponseWriter, r *http.Request) {
	// Extract schema path from URL
	schemaPath := strings.TrimPrefix(r.URL.Path, "/schemas/")

	// Construct the full path within the embedded filesystem
	fullPath := filepath.Join("schemas", schemaPath)

	// Read the file from embedded filesystem
	data, err := schemasFS.ReadFile(fullPath)
	if err != nil {
		http.Error(w, "Schema not found", http.StatusNotFound)
		return
	}

	// Set content type and serve the schema
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

// ListEmbeddedSchemas lists all available schemas
func ListEmbeddedSchemas(w http.ResponseWriter, r *http.Request) {
	var schemas []string

	err := fs.WalkDir(schemasFS, "schemas", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() {
			// Remove the "schemas/" prefix for the API response
			relativePath := strings.TrimPrefix(path, "schemas/")
			schemas = append(schemas, relativePath)
		}
		return nil
	})

	if err != nil {
		http.Error(w, "Failed to list schemas", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string][]string{"schemas": schemas})
}

// ServeDevSchemas serves schema files from disk in dev mode
func ServeDevSchemas(w http.ResponseWriter, r *http.Request, schemasDir string) {
	// Extract schema path from URL
	schemaPath := strings.TrimPrefix(r.URL.Path, "/schemas/")

	// Construct the full path
	fullPath := filepath.Join(schemasDir, schemaPath)

	// Read the file from disk
	data, err := os.ReadFile(fullPath)
	if err != nil {
		http.Error(w, "Schema not found", http.StatusNotFound)
		return
	}

	// Set content type and serve the schema
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

// ListDevSchemas lists all available schemas from disk in dev mode
func ListDevSchemas(w http.ResponseWriter, r *http.Request, schemasDir string) {
	var schemas []string

	err := filepath.Walk(schemasDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			// Get relative path from schemasDir
			relativePath, _ := filepath.Rel(schemasDir, path)
			schemas = append(schemas, relativePath)
		}
		return nil
	})

	if err != nil {
		http.Error(w, "Failed to list schemas", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string][]string{"schemas": schemas})
}
