// Cargar simulación seleccionada
        function loadSimulation(type) {
            let title, description, formHtml, simulationType;
            
            switch(type) {
                case 'binomial_puntual':
                    title = "Simulación Binomial Puntual";
                    description = "Simula el lanzamiento de una moneda y muestra los resultados de caras y cruces.";
                    simulationType = "puntual";
                    formHtml = `
                        <div class="mb-3">
                            <label for="numIntentos" class="form-label">
                                Número de intentos (n)
                                <i class="fas fa-info-circle info-icon" data-bs-toggle="tooltip" title="Cantidad de lanzamientos de moneda a simular"></i>
                            </label>
                            <input type="number" class="form-control" id="numIntentos" value="100" min="1">
                        </div>
                        
                        <div class="mb-4">
                            <label for="probabilidad" class="form-label">
                                Probabilidad de éxito (p)
                                <i class="fas fa-info-circle info-icon" data-bs-toggle="tooltip" title="Probabilidad de que salga cara en cada lanzamiento (0 ≤ p ≤ 1)"></i>
                            </label>
                            <input type="number" class="form-control" id="probabilidad" value="0.5" step="0.01" min="0" max="1">
                        </div>
                    `;
                    break;
                    
                case 'binomial_distribucion':
                    title = "Distribución Binomial";
                    description = "Simula la distribución binomial para un número de intentos y probabilidad dados.";
                    simulationType = "binomial";
                    formHtml = `
                        <div class="mb-3">
                            <label for="numIntentos" class="form-label">
                                Número de intentos (n)
                                <i class="fas fa-info-circle info-icon" data-bs-toggle="tooltip" title="Número de ensayos independientes"></i>
                            </label>
                            <input type="number" class="form-control" id="numIntentos" value="20" min="1">
                        </div>

                        <div class="mb-4">
                            <label for="probabilidad" class="form-label">
                                Probabilidad de éxito (p)
                                <i class="fas fa-info-circle info-icon" data-bs-toggle="tooltip" title="Probabilidad de éxito en cada ensayo (0 ≤ p ≤ 1)"></i>
                            </label>
                            <input type="number" class="form-control" id="probabilidad" value="0.5" step="0.01" min="0" max="1">
                        </div>
                    `;
                    break;
                    
                case 'exponencial':
                    title = "Distribución Exponencial";
                    description = "Simula una distribución exponencial y muestra las muestras generadas.";
                    simulationType = "exponencial";
                    formHtml = `
                        <div class="mb-3">
                            <label for="numMuestras" class="form-label">
                                Número de muestras (n)
                                <i class="fas fa-info-circle info-icon" data-bs-toggle="tooltip" title="Cantidad de valores a generar en la simulación"></i>
                            </label>
                            <input type="number" class="form-control" id="numMuestras" value="1000" min="1">
                        </div>
                        
                        <div class="mb-4">
                            <label for="lambda" class="form-label">
                                Parámetro λ (tasa)
                                <i class="fas fa-info-circle info-icon" data-bs-toggle="tooltip" title="Valor de la tasa de decaimiento. λ > 0"></i>
                            </label>
                            <input type="number" class="form-control" id="lambda" value="0.5" step="0.01" min="0.01">
                        </div>
                    `;
                    break;
                    
                case 'multinomial':
                    title = "Distribución Multinomial";
                    description = "Simula lanzamientos de un dado y muestra la distribución de resultados.";
                    simulationType = "multinomial";
                    formHtml = `
                        <div class="mb-4">
                            <label for="numIntentos" class="form-label">
                                Número de lanzamientos (n)
                                <i class="fas fa-info-circle info-icon" data-bs-toggle="tooltip" title="Cantidad de veces que se lanzará el dado"></i>
                            </label>
                            <input type="number" class="form-control" id="numIntentos" value="100" min="1">
                        </div>
                    `;
                    break;
            }
            
            const simulationHTML = `
                <div class="nav-back">
                    <button class="btn btn-sm btn-outline-primary" onclick="location.reload()">
                        <i class="fas fa-arrow-left me-1"></i> Volver al menú
                    </button>
                </div>
                
                <div class="card">
                    <div class="card-header ${simulationType}-header">
                        <i class="fas fa-${getIcon(type)} me-2"></i>${title}
                    </div>
                    <div class="card-body">
                        <p class="text-muted">${description}</p>
                        
                        <div class="row">
                            <div class="col-lg-5">
                                <div class="settings-panel">
                                    <h5 class="mb-4"><i class="fas fa-sliders-h me-2"></i>Configuración</h5>
                                    ${formHtml}
                                    
                                    <div class="d-grid">
                                        <button class="btn btn-${simulationType} btn-lg" id="btnGenerarSimulacion">
                                            <i class="fas fa-sync-alt me-2"></i>Generar Simulación
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="card mt-4">
                                    <div class="card-header bg-info text-white">
                                        <i class="fas fa-chart-bar me-2"></i>Estadísticas
                                    </div>
                                    <div class="card-body">
                                        <div id="estadisticas-container">
                                            <p class="text-center text-muted">Ejecuta la simulación para ver las estadísticas</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="col-lg-7">
                                <div class="card">
                                    <div class="card-body">
                                        <div class="loading-overlay" id="loadingIndicator" style="display: none;">
                                            <div class="text-center">
                                                <div class="spinner-border text-primary mb-2" style="width: 3rem; height: 3rem;" role="status">
                                                    <span class="visually-hidden">Cargando...</span>
                                                </div>
                                                <p>Procesando simulación...</p>
                                            </div>
                                        </div>
                                        <div class="chart-container">
                                            <canvas id="graficoSimulacion"></canvas>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('simulation-container').innerHTML = simulationHTML;
            
            // Inicializar tooltips
            var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
            var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl)
            });
            
            // Configurar el evento del botón de simulación
            document.getElementById('btnGenerarSimulacion').addEventListener('click', function() {
                runSimulation(type);
            });
        }
        
        // Obtener icono según el tipo de simulación
        function getIcon(type) {
            switch(type) {
                case 'binomial_puntual': return 'coins';
                case 'binomial_distribucion': return 'chart-bar';
                case 'exponencial': return 'chart-line';
                case 'multinomial': return 'dice';
                default: return 'chart-bar';
            }
        }
        
        // Ejecutar la simulación seleccionada
        function runSimulation(type) {
            // Aquí iría la lógica para cada tipo de simulación
            // Por ahora, mostramos un mensaje de simulación completada
            document.getElementById('loadingIndicator').style.display = 'flex';
            
            setTimeout(() => {
                document.getElementById('loadingIndicator').style.display = 'none';
                
                // Mensaje de ejemplo
                document.getElementById('estadisticas-container').innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle me-2"></i> Simulación completada correctamente.
                    </div>
                `;
                
                // Aquí iría la lógica para mostrar el gráfico correspondiente
            }, 1500);
        }