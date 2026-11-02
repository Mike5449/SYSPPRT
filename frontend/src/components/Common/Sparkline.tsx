import { Box } from "@chakra-ui/react"
import type React from "react"

type SparklineProps = {
  data: number[]
  width?: number
  height?: number
  stroke?: string
  fill?: string
}

const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 120,
  height = 36,
  stroke = "#3182ce",
  fill = "rgba(49,130,206,0.08)",
}) => {
  if (!data || data.length === 0) {
    return <Box w={`${width}px`} h={`${height}px`} />
  }

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((v - min) / range) * height
      return `${x},${y}`
    })
    .join(" ")

  const areaPath = `M0,${height} L${points} L${width},${height} Z`

  return (
    <Box w={`${width}px`} h={`${height}px`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <path d={areaPath} fill={fill} stroke="none" />
        <polyline
          points={points}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </Box>
  )
}

export default Sparkline
