// Inicializar tooltips
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
});

const btnGenerarNormal = document.getElementById('btnGenerarNormal');
const graficoNormalCanvas = document.getElementById('graficoNormal');
const loadingIndicator = document.getElementById('loadingIndicator');
let chartNormal = null;

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

btnGenerarNormal.addEventListener('click', async () => {
    const n = parseInt(document.getElementById('numMuestras').value);
    const mu = parseFloat(document.getElementById('media').value);
    const sigma = parseFloat(document.getElementById('desviacion').value);
    
    if (isNaN(n) || n <= 0) {
        alert("Por favor, ingrese un número válido de muestras (n > 0)");
        return;
    }
    
    if (isNaN(sigma) || sigma <= 0) {
        alert("Por favor, ingrese un valor válido para σ (σ > 0)");
        return;
    }

    // Mostrar loading
    loadingIndicator.style.display = 'flex';
    btnGenerarNormal.disabled = true;

    try {
        // Hacer la solicitud POST a Flask
        const response = await fetch('/normal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({n: n, mu: mu, sigma: sigma})
        });

        if (!response.ok) {
            throw new Error('Error en la solicitud: ' + response.statusText);
        }

        const data = await response.json();
        
        // Actualizar estadísticas en la UI
        document.getElementById('mediaMuestral').textContent = data.media_muestral.toFixed(4);
        document.getElementById('mediaTeorica').textContent = data.media_teorica.toFixed(4);
        document.getElementById('varianzaMuestral').textContent = data.varianza_muestral.toFixed(4);
        document.getElementById('varianzaTeorica').textContent = data.varianza_teorica.toFixed(4);
        
        // Destruir gráfico anterior si existe
        if (chartNormal) {
            chartNormal.destroy();
        }

        // Calcular histograma de las muestras
        const numBins = Math.min(30, Math.max(5, Math.floor(Math.sqrt(n))));
        const histograma = calcularHistograma(data.muestras, numBins);
        
        // Crear el nuevo gráfico
        const ctx = graficoNormalCanvas.getContext('2d');
        chartNormal = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: histograma.puntosMedios.map(x => x.toFixed(2)),
                datasets: [
                    {
                        label: 'Densidad de Muestras (Histograma)',
                        data: histograma.densidad,
                        backgroundColor: 'rgba(67, 97, 238, 0.7)',
                        borderColor: 'rgba(58, 12, 163, 1)',
                        borderWidth: 1,
                        barPercentage: 0.9,
                        categoryPercentage: 1.0
                    },
                    {
                        label: 'Curva Teórica Normal',
                        data: data.pdf_teorica,
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
                        text: `Distribución Normal (μ = ${mu}, σ = ${sigma}, n = ${n})`,
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
        btnGenerarNormal.disabled = false;
    }
});

// Generar gráfico inicial al cargar la página
window.addEventListener('load', () => {
    btnGenerarNormal.click();
});