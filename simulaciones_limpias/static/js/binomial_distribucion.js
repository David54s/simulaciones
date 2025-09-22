// Inicializar tooltips
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
        var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl)
        });
        
        const btnGenerarSimulacion = document.getElementById('btnGenerarSimulacion');
        const graficoSimulacionCanvas = document.getElementById('graficoSimulacion');
        const loadingIndicator = document.getElementById('loadingIndicator');
        let chartSimulacion = null;

        btnGenerarSimulacion.addEventListener('click', async () => {
            // Obtener los parámetros del formulario
            const n = parseInt(document.getElementById('numIntentos').value);
            const p = parseFloat(document.getElementById('probabilidad').value);
            const repeticiones = parseInt(document.getElementById('repeticiones').value);
            
            if (isNaN(n) || n <= 0) {
                alert("Por favor, ingrese un número válido de intentos (n > 0)");
                return;
            }
            
            if (isNaN(p) || p < 0 || p > 1) {
                alert("Por favor, ingrese un valor válido para la probabilidad (0 ≤ p ≤ 1)");
                return;
            }

            if (isNaN(repeticiones) || repeticiones < 10) {
                alert("Por favor, ingrese un número válido de repeticiones (≥ 10)");
                return;
            }

            // Mostrar loading
            loadingIndicator.style.display = 'flex';
            btnGenerarSimulacion.disabled = true;

            try {
                // Hacer la solicitud POST a Flask
                const response = await fetch('/binomial_simulacion', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({n: n, p: p, repeticiones: repeticiones})
                });

                if (!response.ok) {
                    throw new Error('Error en la solicitud: ' + response.statusText);
                }

                const data = await response.json();

                // Limpiar el gráfico anterior si existe
                if (chartSimulacion) {
                    chartSimulacion.destroy();
                }

                // Calcular estadísticas
                const media_teorica = n * p;
                const varianza_teorica = n * p * (1 - p);
                
                // Calcular media empírica
                let media_empirica = 0;
                for (let i = 0; i < data.valores.length; i++) {
                    media_empirica += data.valores[i] * data.prob_empirica[i];
                }
                
                // Calcular varianza empírica
                let varianza_empirica = 0;
                for (let i = 0; i < data.valores.length; i++) {
                    varianza_empirica += Math.pow(data.valores[i] - media_empirica, 2) * data.prob_empirica[i];
                }
                
                // Calcular moda empírica
                const maxFreq = Math.max(...data.freq_empirica);
                const modaIndex = data.freq_empirica.indexOf(maxFreq);
                
                // Actualizar estadísticas
                document.getElementById('estadisticas-container').innerHTML = `
                    <div class="row text-center">
                        <div class="col-6 mb-3">
                            <div class="stat-card">
                                <div class="stat-label">Media teórica</div>
                                <div class="stat-value">${media_teorica.toFixed(2)}</div>
                            </div>
                        </div>
                        <div class="col-6 mb-3">
                            <div class="stat-card">
                                <div class="stat-label">Media empírica</div>
                                <div class="stat-value">${media_empirica.toFixed(2)}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="stat-card">
                                <div class="stat-label">Varianza teórica</div>
                                <div class="stat-value">${varianza_teorica.toFixed(2)}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="stat-card">
                                <div class="stat-label">Varianza empírica</div>
                                <div class="stat-value">${varianza_empirica.toFixed(2)}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="stat-card">
                                <div class="stat-label">Valor más frecuente</div>
                                <div class="stat-value">${modaIndex}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="stat-card">
                                <div class="stat-label">Experimentos realizados</div>
                                <div class="stat-value">${data.repeticiones}</div>
                            </div>
                        </div>
                    </div>
                `;

                // Preparar datos para el gráfico
                const datasets = [
                    {
                        label: "Distribución Empírica",
                        data: data.prob_empirica,
                        backgroundColor: "rgba(114, 9, 183, 0.7)",
                        borderColor: "rgba(114, 9, 183, 1)",
                        borderWidth: 1
                    },
                    {
                        label: "Distribución Teórica",
                        data: data.prob_teorica,
                        backgroundColor: "rgba(76, 201, 240, 0.3)",
                        borderColor: "rgba(76, 201, 240, 1)",
                        borderWidth: 1,
                        type: 'line',
                        pointRadius: 0
                    }
                ];

                // Generar la nueva gráfica con Chart.js
                const dataGrafica = {
                    labels: data.valores,
                    datasets: datasets
                };

                // Crear la gráfica
                chartSimulacion = new Chart(graficoSimulacionCanvas, {
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
                                    text: 'Probabilidad',
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
                                title: {
                                    display: true,
                                    text: 'Número de éxitos',
                                    color: '#666',
                                    font: {
                                        weight: 'bold'
                                    }
                                },
                                grid: {
                                    display: false
                                }
                            }
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: `Simulación Binomial (n = ${n}, p = ${p}) - ${data.repeticiones} experimentos`,
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
                                        return `${context.dataset.label}: ${(context.raw * 100).toFixed(2)}%`;
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
                btnGenerarSimulacion.disabled = false;
            }
        });