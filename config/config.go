package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DockerSock         string
	CORSAllowedOrigins []string
	DockerHost         string
}

func LoadConfig() (config Config, err error) {
	if err := godotenv.Load(); err != nil {
		fmt.Println("[WARNING]: .env not found, using system environment variables")
	}
	config.DockerSock = os.Getenv("DOCKER_SOCK")
	config.CORSAllowedOrigins = strings.Split(os.Getenv("CORS_ALLOWED_ORIGINS"), "")
	config.DockerHost = os.Getenv("DOCKER_HOST")
	if err := validateConfig(&config); err != nil {
		return config, err
	}
	return config, nil
}

func validateConfig(config *Config) error {
	if config.DockerSock == "" {
		config.DockerSock = "/var/run/docker.sock"
	}
	if config.DockerHost == "" {
		config.DockerHost = "http://localhost"
	}
	return nil
}
