package main

import (
	"fmt"
	"os"

	"github.com/your-org/ci-pipeline-tool/internal/pipeline"
)

func main() {
	p, err := pipeline.Load("pipeline.yml")
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}
	os.Exit(p.Run())
}
