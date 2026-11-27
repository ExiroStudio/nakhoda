package server

import (
	"backend/frontend"
	"io/fs"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/static"
)

func registerFrontend(app *fiber.App) error {
	dist, err := fs.Sub(frontend.Dist, "dist")
	if err != nil {
		return err
	}

	app.Use("/", static.New("", static.Config{FS: dist}))

	app.Get("/*", func(c fiber.Ctx) error {
		return c.SendFile("index.html", fiber.SendFile{FS: dist})
	})
	return nil
}
