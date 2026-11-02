import mermaid from "mermaid"
import type React from "react"
import { useEffect, useRef } from "react"

interface MermaidProps {
  chart: string
}

mermaid.initialize({
  startOnLoad: true,
  theme: "default",
  securityLevel: "loose",
  fontFamily: "Inter, sans-serif",
})

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const id = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`).current

  useEffect(() => {
    const renderChart = async () => {
      if (containerRef.current && chart) {
        try {
          // Clear current content
          containerRef.current.innerHTML = ""
          // Render new chart
          const { svg } = await mermaid.render(id, chart)
          containerRef.current.innerHTML = svg
        } catch (error) {
          console.error("Mermaid rendering error:", error)
          if (containerRef.current) {
            containerRef.current.innerHTML = `<pre style="color: red;">Mermaid Error: ${error}</pre>`
          }
        }
      }
    }
    renderChart()
  }, [chart, id])

  return <div ref={containerRef} style={{ width: "100%", overflow: "auto" }} />
}

export default Mermaid
