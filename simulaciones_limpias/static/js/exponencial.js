let resultadosSimulacion = null;
let parametrosSimulacion = null;

// Inicializar tooltips
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
});

const btnGenerarExponencial = document.getElementById('btnGenerarExponencial');
const graficoExponencialCanvas = document.getElementById('graficoExponencial');
const loadingIndicator = document.getElementById('loadingIndicator');
let chartExponencial = null;

// Función para calcular el histograma
function calcularHistograma(datos, numBins) {
    if (datos.length === 0) return { puntosMedios: [], densidad: [], binEdges: [] };
    
    const min = Math.min(...datos);
    const max = Math.max(...datos);
    const range = max - min || 1;
    const binWidth = range / numBins;
    
    const bins = Array(numBins).fill(0);
    const binEdges = Array(numBins + 1).fill(0).map((_, i) => min + i * binWidth);
    
    // Contar frecuencias
    datos.forEach(valor => {
        let binIndex = Math.floor((valor - min) / binWidth);
        if (binIndex === numBins) binIndex--;
        bins[binIndex]++;
    });
    
    // Normalizar el histograma para que el área sea 1
    const area = binWidth * datos.length;
    const densidad = bins.map(count => count / area);
    
    // Los puntos del histograma para graficar (punto medio de cada bin)
    const puntosMedios = binEdges.slice(0, -1).map((edge, i) => edge + binWidth / 2);
    
    return { puntosMedios, densidad, binEdges, binWidth };
}

btnGenerarExponencial.addEventListener('click', async () => {
    const n = parseInt(document.getElementById('numMuestras').value);
    const lambda = parseFloat(document.getElementById('lambda').value);
    
    if (isNaN(n) || n <= 0) {
        alert("Por favor, ingrese un número válido de muestras (n > 0)");
        return;
    }
    
    if (isNaN(lambda) || lambda <= 0) {
        alert("Por favor, ingrese un valor válido para λ (λ > 0)");
        return;
    }

    // Mostrar loading
    loadingIndicator.style.display = 'flex';
    btnGenerarExponencial.disabled = true;

    try {
        // Hacer la solicitud POST a Flask
        const response = await fetch('/exponencial', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({n: n, lambda: lambda})
        });

        if (!response.ok) {
            throw new Error('Error en la solicitud: ' + response.statusText);
        }

        const data = await response.json();
        
        // Calcular estadísticas
        const suma = data.muestras.reduce((a, b) => a + b, 0);
        const mediaMuestral = suma / n;
        const mediaTeorica = 1 / lambda;
        
        const varianzaMuestral = data.muestras.reduce((a, b) => a + Math.pow(b - mediaMuestral, 2), 0) / n;
        const varianzaTeorica = 1 / Math.pow(lambda, 2);
        
        // Actualizar estadísticas en la UI
        document.getElementById('mediaMuestral').textContent = mediaMuestral.toFixed(4);
        document.getElementById('mediaTeorica').textContent = mediaTeorica.toFixed(4);
        document.getElementById('varianzaMuestral').textContent = varianzaMuestral.toFixed(4);
        document.getElementById('varianzaTeorica').textContent = varianzaTeorica.toFixed(4);
        

        // Guardar resultados para descarga
        resultadosSimulacion = data.muestras;
        parametrosSimulacion = {n: n, lambda: lambda};
        document.getElementById('download-section').style.display = 'block';
        
        // Destruir gráfico anterior si existe
        if (chartExponencial) {
            chartExponencial.destroy();
        }

        // Calcular histograma de las muestras
        const numBins = Math.min(30, Math.max(5, Math.floor(Math.sqrt(n))));
        const histograma = calcularHistograma(data.muestras, numBins);
        
        // Crear el nuevo gráfico
        const ctx = graficoExponencialCanvas.getContext('2d');
        chartExponencial = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: histograma.puntosMedios.map(x => x.toFixed(2)),
                datasets: [
                    {
                        label: 'Densidad de Muestras (Histograma)',
                        data: histograma.densidad,
                        backgroundColor: 'rgba(255, 105, 180, 0.7)',
                        borderColor: 'rgba(255, 20, 147, 1)',
                        borderWidth: 1,
                        barPercentage: 0.9,
                        categoryPercentage: 1.0
                    },
                    {
                        label: 'Curva Teórica Exponencial',
                        data: data.pdf_values,
                        backgroundColor: 'rgba(247, 37, 133, 0)',
                        borderColor: 'rgba(247, 37, 133, 1)',
                        borderWidth: 3,
                        pointRadius: 0,
                        fill: false,
                        type: 'line'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Valor',
                            color: '#666',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Densidad',
                            color: '#666',
                            font: {
                                weight: 'bold'
                            }
                        },
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `Distribución Exponencial (λ = ${lambda}, n = ${n})`,
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#333'
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 13
                            },
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += context.parsed.y.toFixed(4);
                                return label;
                            }
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al generar la simulación: ' + error.message);
    } finally {
        // Ocultar loading
        loadingIndicator.style.display = 'none';
        btnGenerarExponencial.disabled = false;
    }
});

// Generar gráfico inicial al cargar la página
window.addEventListener('load', () => {
    btnGenerarExponencial.click();
});


// Funcionalidad de descarga
document.getElementById('btnDescargar').addEventListener('click', () => {
    if (!resultadosSimulacion) {
        alert('No hay resultados para descargar');
        return;
    }
    
    let contenido = '======== SIMULACION EXPONENCIAL ========\n\n';
    contenido += `Parámetros: n=${parametrosSimulacion.n}, lambda=${parametrosSimulacion.lambda}\n\n`;
    
    resultadosSimulacion.forEach((valor, index) => {
        contenido += `Muestra ${index + 1}: ${valor.toFixed(4)}\n`;
    });
    
    // Crear y descargar archivo
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'resultados_exponencial.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});