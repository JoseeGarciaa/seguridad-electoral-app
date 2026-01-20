"use client"

import { motion, useInView } from "framer-motion"
import { useRef, useEffect, useState } from "react"
import { Clock, DollarSign, Building2, CheckCircle } from "lucide-react"

interface AnimatedCounterProps {
  end: number
  duration?: number
  prefix?: string
  suffix?: string
}

function AnimatedCounter({ end, duration = 2, prefix = "", suffix = "" }: AnimatedCounterProps) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  
  useEffect(() => {
    if (!isInView) return
    
    const startTime = Date.now()
    const endTime = startTime + duration * 1000
    
    const tick = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - progress, 3) // Ease out cubic
      setCount(Math.round(eased * end))
      
      if (now < endTime) {
        requestAnimationFrame(tick)
      }
    }
    
    requestAnimationFrame(tick)
  }, [isInView, end, duration])
  
  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  )
}

const stats = [
  {
    icon: Clock,
    value: 500,
    suffix: "+",
    label: "Horas Ahorradas",
    description: "Por campaña electoral",
  },
  {
    icon: DollarSign,
    value: 40,
    prefix: "",
    suffix: "%",
    label: "Ahorro en Logística",
    description: "Optimización de recursos",
  },
  {
    icon: Building2,
    value: 100,
    suffix: "%",
    label: "Puestos Cubiertos",
    description: "Sin caos operativo",
  },
  {
    icon: CheckCircle,
    value: 0,
    suffix: "",
    label: "Excel Necesario",
    description: "Todo digitalizado",
  },
]

export function StatsSection() {
  return (
    <section id="stats" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">
            ROI Comprobado
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Resultados reales de campañas que han transformado su operación electoral
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative group"
            >
              <div className="glass rounded-xl border border-border/50 p-6 text-center h-full transition-all duration-300 hover:border-primary/50 hover:glow-green">
                {/* Icon */}
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                
                {/* Value */}
                <div className="text-4xl font-bold text-foreground mb-2">
                  <AnimatedCounter 
                    end={stat.value} 
                    prefix={stat.prefix} 
                    suffix={stat.suffix}
                  />
                </div>
                
                {/* Label */}
                <div className="text-sm font-medium text-foreground mb-1">
                  {stat.label}
                </div>
                
                {/* Description */}
                <div className="text-xs text-muted-foreground">
                  {stat.description}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
