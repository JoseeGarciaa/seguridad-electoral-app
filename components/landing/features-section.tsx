"use client"

import { motion } from "framer-motion"
import { 
  Map, 
  Users, 
  BarChart3, 
  Camera, 
  Bell, 
  Shield,
  Target,
  Zap,
  Globe
} from "lucide-react"

const features = [
  {
    icon: Map,
    title: "Territorio PRO",
    description: "Mapas interactivos con Heatmap y visualización 3D de puestos de votación. Control total del DIVIPOLE.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Shield,
    title: "War Room Electoral",
    description: "Centro de comando en tiempo real. Evidencias, alertas automáticas y semáforo municipal.",
    color: "text-neon-cyan",
    bgColor: "bg-neon-cyan/10",
  },
  {
    icon: Users,
    title: "Gestión de Equipo",
    description: "Coordinadores, líderes, voluntarios y testigos. Gamificación y métricas de rendimiento.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: Camera,
    title: "Evidencia Digital",
    description: "Captura y validación de actas en tiempo real. Storage seguro y verificación automática.",
    color: "text-neon-orange",
    bgColor: "bg-neon-orange/10",
  },
  {
    icon: BarChart3,
    title: "Analytics Avanzado",
    description: "Comparativos por candidato, partido y territorio. Proyecciones y tendencias en vivo.",
    color: "text-neon-green",
    bgColor: "bg-neon-green/10",
  },
  {
    icon: Bell,
    title: "Alertas Inteligentes",
    description: "Notificaciones de cobertura, anomalías y eventos críticos. Nunca más sorpresas.",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  {
    icon: Target,
    title: "Asignaciones Día D",
    description: "Distribución óptima de testigos. Import CSV y tracking de cobertura en tiempo real.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Globe,
    title: "Simpatizantes",
    description: "Base de datos georreferenciada. Estados de apoyo, actividades y segmentación avanzada.",
    color: "text-neon-cyan",
    bgColor: "bg-neon-cyan/10",
  },
  {
    icon: Zap,
    title: "Operaciones",
    description: "Tareas Kanban, eventos de campaña, metas y comunicación segmentada.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <span className="text-sm font-medium text-primary">MÓDULOS DISPONIBLES</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">
            Todo lo que necesitas para ganar
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Suite completa de herramientas para el control total de tu campaña electoral
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="group"
            >
              <div className="glass rounded-xl border border-border/50 p-6 h-full transition-all duration-300 hover:border-primary/30 hover:translate-y-[-2px]">
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${feature.bgColor} mb-4 transition-transform group-hover:scale-110`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                
                {/* Title */}
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                
                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
