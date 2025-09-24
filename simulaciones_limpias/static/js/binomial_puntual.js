let resultadosSimulacion = null;
let parametrosSimulacion = null;
// Inicializar tooltips
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
        var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl)
        });
        
        const btnGenerarBinomial = document.getElementById('btnGenerarBinomial');
        const graficoBinomialCanvas = document.getElementById('graficoBinomial');
        const loadingIndicator = document.getElementById('loadingIndicator');
        let chart = null;

        btnGenerarBinomial.addEventListener('click', async () => {
            // Obtener los parámetros del formulario
            const n = parseInt(document.getElementById('numIntentos').value);
            const p = parseFloat(document.getElementById('probabilidad').value);
            
            if (isNaN(n) || n <= 0) {
                alert("Por favor, ingrese un número válido de intentos (n > 0)");
                return;
            }
            
            if (isNaN(p) || p < 0 || p > 1) {
                alert("Por favor, ingrese un valor válido para la probabilidad (0 ≤ p ≤ 1)");
                return;
            }

            // Mostrar loading
            loadingIndicator.style.display = 'flex';
            btnGenerarBinomial.disabled = true;

            try {
                // Hacer la solicitud POST a Flask
                const response = await fetch('/binomial_puntual', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({n: n, p: p})
                });

                if (!response.ok) {
                    throw new Error('Error en la solicitud: ' + response.statusText);
                }

                const data = await response.json();

                // Limpiar el gráfico anterior si existe
                if (chart) {
                    chart.destroy();
                }

                // Calcular estadísticas
                const caras = data.resultados.filter(r => r === "1").length;
                const cruces = data.resultados.filter(r => r === "0").length;
                const proporcionCaras = caras / n;
                const proporcionCruces = cruces / n;
                
                // Actualizar estadísticas
                document.getElementById('estadisticas-container').innerHTML = `
                    <div class="row text-center">
                        <div class="col-6 mb-3">
                            <div class="stat-card">
                                <div class="stat-label">Caras (éxitos)</div>
                                <div class="stat-value">${caras}</div>
                                <div class="stat-label">${(proporcionCaras * 100).toFixed(1)}%</div>
                            </div>
                        </div>
                        <div class="col-6 mb-3">
                            <div class="stat-card">
                                <div class="stat-label">Cruces (fracasos)</div>
                                <div class="stat-value">${cruces}</div>
                                <div class="stat-label">${(proporcionCruces * 100).toFixed(1)}%</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="stat-card">
                                <div class="stat-label">Proporción esperada</div>
                                <div class="stat-value">${p.toFixed(2)}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="stat-card">
                                <div class="stat-label">Diferencia</div>
                                <div class="stat-value">${Math.abs(p - proporcionCaras).toFixed(3)}</div>
                            </div>
                        </div>
                    </div>
                `;
                // Guardar resultados para descarga
                resultadosSimulacion = data.resultados;
                parametrosSimulacion = {n: n, p: p};                
                // Mostrar botón de descarga
                document.getElementById('download-section').style.display = 'block';

                // Generar la nueva gráfica con Chart.js
                const dataGrafica = {
                    labels: ["Caras", "Cruces"],
                    datasets: [{
                        label: "Resultados Binomial Puntual",
                        data: [caras, cruces],
                        backgroundColor: ["#4cc9f0", "#f72585"],
                        borderColor: ["#3ab3d9", "#d11c74"],
                        borderWidth: 1
                    }]
                };

                // Crear la gráfica
                chart = new Chart(graficoBinomialCanvas, {
                    type: 'bar',
                    data: dataGrafica,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Frecuencia',
                                    color: '#666',
                                    font: {
                                        weight: 'bold'
                                    }
                                },
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.05)'
                                }
                            },
                            x: {
                                grid: {
                                    display: false
                                }
                            }
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: `Distribución Binomial Puntual (N = ${n}, p = ${p})`,
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
                                        return `${context.label}: ${context.raw} (${((context.raw/n)*100).toFixed(1)}%)`;
                                    }
                                }
                            }
                        }
                    },
                });
                
            } catch (error) {
                console.error('Error:', error);
                alert('Error al generar la simulación: ' + error.message);
            } finally {
                // Ocultar loading
                loadingIndicator.style.display = 'none';
                btnGenerarBinomial.disabled = false;
            }
        });

// Funcionalidad de descarga
        document.getElementById('btnDescargar').addEventListener('click', () => {
            if (!resultadosSimulacion) {
                alert('No hay resultados para descargar');
                return;
            }
            
            let contenido = '======== SIMULACION BINOMIAL PUNTUAL ========\n\n';
            contenido += `Parámetros: n=${parametrosSimulacion.n}, p=${parametrosSimulacion.p}\n\n`;
            
            resultadosSimulacion.forEach((resultado, index) => {
                const tipo = resultado === "1" ? "Éxito" : "Fracaso";
                contenido += `Intento ${index + 1}: ${tipo}\n`;
            });
            
            // Crear y descargar archivo
            const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'resultados.txt';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });