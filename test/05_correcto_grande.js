// Sistema de gestión de tareas completo
class GestorTareas {
    constructor() {
        this.tareas = [];
        this.categorias = new Set();
        this.contadorId = 1;
    }
    
    agregarTarea(titulo, descripcion, categoria = "general", prioridad = "media") {
        const tarea = {
            id: this.contadorId++,
            titulo,
            descripcion,
            categoria,
            prioridad,
            completada: false,
            fechaCreacion: new Date(),
            fechaVencimiento: null
        };
        
        this.tareas.push(tarea);
        this.categorias.add(categoria);
        return tarea;
    }
    
    completarTarea(id) {
        const tarea = this.tareas.find(t => t.id === id);
        if (tarea) {
            tarea.completada = true;
            tarea.fechaCompletada = new Date();
            return true;
        }
        return false;
    }
    
    eliminarTarea(id) {
        const indice = this.tareas.findIndex(t => t.id === id);
        if (indice !== -1) {
            this.tareas.splice(indice, 1);
            return true;
        }
        return false;
    }
    
    filtrarTareas(filtros = {}) {
        return this.tareas.filter(tarea => {
            if (filtros.categoria && tarea.categoria !== filtros.categoria) {
                return false;
            }
            if (filtros.prioridad && tarea.prioridad !== filtros.prioridad) {
                return false;
            }
            if (filtros.completada !== undefined && tarea.completada !== filtros.completada) {
                return false;
            }
            return true;
        });
    }
    
    obtenerEstadisticas() {
        const total = this.tareas.length;
        const completadas = this.tareas.filter(t => t.completadas).length;
        const pendientes = total - completadas;
        
        const porCategoria = {};
        this.tareas.forEach(tarea => {
            porCategoria[tarea.categoria] = (porCategoria[tarea.categoria] || 0) + 1;
        });
        
        return {
            total,
            completadas,
            pendientes,
            porcentajeCompletadas: total > 0 ? (completadas / total) * 100 : 0,
            porCategoria
        };
    }
    
    exportarTareas() {
        return JSON.stringify(this.tareas, null, 2);
    }
    
    importarTareas(datosJson) {
        try {
            const tareasImportadas = JSON.parse(datosJson);
            if (Array.isArray(tareasImportadas)) {
                this.tareas = [...this.tareas, ...tareasImportadas];
                return true;
            }
        } catch (error) {
            console.error("Error al importar tareas:", error);
        }
        return false;
    }
}

// Funciones de utilidad
const utilidades = {
    formatearFecha(fecha) {
        return fecha.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },
    
    validarPrioridad(prioridad) {
        return ['baja', 'media', 'alta'].includes(prioridad);
    },
    
    generarReporte(gestor) {
        const stats = gestor.obtenerEstadisticas();
        return `
=== REPORTE DE TAREAS ===
Total de tareas: ${stats.total}
Completadas: ${stats.completadas}
Pendientes: ${stats.pendientes}
Progreso: ${stats.porcentajeCompletadas.toFixed(1)}%

Tareas por categoría:
${Object.entries(stats.porCategoria)
    .map(([cat, count]) => `  ${cat}: ${count}`)
    .join('\n')}
        `.trim();
    }
};

// Uso del sistema
const gestor = new GestorTareas();

// Agregar algunas tareas de ejemplo
gestor.agregarTarea("Revisar código", "Revisar el código del proyecto principal", "desarrollo", "alta");
gestor.agregarTarea("Documentar API", "Crear documentación para la nueva API", "documentacion", "media");
gestor.agregarTarea("Reunión equipo", "Reunión semanal con el equipo de desarrollo", "reuniones", "baja");

// Completar una tarea
gestor.completarTarea(1);

// Mostrar estadísticas
console.log(utilidades.generarReporte(gestor));

// Filtrar tareas pendientes
const tareasPendientes = gestor.filtrarTareas({ completada: false });
console.log("Tareas pendientes:", tareasPendientes.length);
