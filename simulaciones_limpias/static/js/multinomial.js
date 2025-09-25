let resultadosSimulacion = null;
let parametrosSimulacion = null;

document.addEventListener('DOMContentLoaded', function() {
    // Elementos DOM
    const btnGenerar = document.getElementById('btnGenerar');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const entropyValue = document.getElementById('entropyValue');
    const maxProbValue = document.getElementById('maxProbValue');
    const uniformityValue = document.getElementById('uniformityValue');
    
    // Función para calcular estadísticas
    function calcularEstadistica(datos) {
        // Calcular probabilidades empíricas
        const frecuencias = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0};
        
        // Sumar todas las frecuencias por cara
        datos.frecuencias.forEach((freq, index) => {
            const cara = datos.caras[index];
            frecuencias[cara] += freq;
        });
        
        // Calcular total de lanzamientos
        const totalLanzamientos = Object.values(frecuencias).reduce((a, b) => a + b, 0);
        
        // Calcular probabilidades
        const probabilidades = [];
        for (let i = 1; i <= 6; i++) {
            probabilidades.push(frecuencias[i] / totalLanzamientos);
        }
        
        // Calcular entropía
        const entropia = probabilidades.reduce((sum, p) => {
            return p > 0 ? sum - p * Math.log2(p) : sum;
        }, 0);
        
        // Calcular máxima probabilidad
        const maxProb = Math.max(...probabilidades);
        
        // Calcular uniformidad (1 = perfectamente uniforme, 0 = completamente sesgado)
        const uniformidad = 1 - (Math.max(...probabilidades) - Math.min(...probabilidades));
        
        return {
            entropia: entropia.toFixed(3),
            maxProb: maxProb.toFixed(3),
            uniformidad: uniformidad.toFixed(3)
        };
    }


    
    // Función para crear el gráfico 3D de montaña
    function crearGraficoMontania3D(datos) {
        // Obtener valores únicos de repeticiones
        const repeticionesUnicas = [...new Set(datos.repeticiones)].sort((a, b) => a - b);
        const carasUnicas = [1, 2, 3, 4, 5, 6];
        
        // Crear matriz Z para la superficie
        const zMatrix = [];
        
        repeticionesUnicas.forEach((rep, repIndex) => {
            const fila = [];
            carasUnicas.forEach(cara => {
                // Encontrar la frecuencia para esta combinación repetición-cara
                const index = datos.repeticiones.findIndex((r, i) => 
                    r === rep && datos.caras[i] === cara
                );
                const frecuencia = index !== -1 ? datos.frecuencias[index] : 0;
                fila.push(frecuencia);
            });
            zMatrix.push(fila);
        });
        
        // Crear traza de superficie
        const trace = {
            type: 'surface',
            x: carasUnicas,
            y: repeticionesUnicas,
            z: zMatrix,
            colorscale: 'Viridis',
            opacity: 0.9,
            contours: {
                z: {
                    show: true,
                    usecolormap: true,
                    highlightcolor: "#42f462",
                    project: {z: true}
                }
            },
            lighting: {
                roughness: 0.8,
                fresnel: 0.5
            },
            lightposition: {
                x: 100,
                y: 200,
                z: 1000
            }
        };
        
        // Diseño del gráfico
        const layout = {
            title: {
                text: 'Distribución Multinomial 3D<br>Superficie de Frecuencia',
                font: { size: 18 }
            },
            scene: {
                xaxis: {
                    title: 'Cara del Dado',
                    backgroundcolor: 'rgb(240, 240, 240)',
                    gridcolor: 'rgb(255, 255, 255)',
                    showbackground: true
                },
                yaxis: {
                    title: 'Número de Repeticiones',
                    backgroundcolor: 'rgb(240, 240, 240)',
                    gridcolor: 'rgb(255, 255, 255)',
                    showbackground: true
                },
                zaxis: {
                    title: 'Frecuencia Acumulada',
                    backgroundcolor: 'rgb(240, 240, 240)',
                    gridcolor: 'rgb(255, 255, 255)',
                    showbackground: true
                },
                camera: {
                    eye: { x: 1.5, y: -1.5, z: 1 }
                }
            },
            margin: {
                l: 0,
                r: 0,
                b: 0,
                t: 50
            }
        };
        
        // Configuración
        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        };
        
        // Renderizar el gráfico
        Plotly.newPlot('grafico3D', [trace], layout, config);
    }


    
    
    // Event listener para el botón Generar
    btnGenerar.addEventListener('click', async function() {
        // Obtener parámetros del formulario
        const numDados = parseInt(document.getElementById('numDice').value);
        const numExperimentos = parseInt(document.getElementById('numExperiments').value);
        const numRepeticiones = parseInt(document.getElementById('numRepetitions').value);
        
        if (isNaN(numDados) || numDados <= 0) {
            alert("Por favor, ingrese un número válido de dados");
            return;
        }
        
        if (isNaN(numExperimentos) || numExperimentos <= 0) {
            alert("Por favor, ingrese un número válido de experimentos");
            return;
        }
        
        if (isNaN(numRepeticiones) || numRepeticiones <= 0) {
            alert("Por favor, ingrese un número válido de repeticiones");
            return;
        }
        
        // Mostrar loading
        loadingIndicator.style.display = 'flex';
        btnGenerar.disabled = true;
        
        try {
            // Hacer la solicitud POST a Flask
            const response = await fetch('/multinomial_3d', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    n: numDados,
                    max_repeticiones: numRepeticiones,
                    puntos_muestra: Math.min(numRepeticiones, 50)
                })
            });

            if (!response.ok) {
                throw new Error('Error en la solicitud: ' + response.statusText);
            }

            const datos = await response.json();

            const datosGrafica = datos.grafica;
            const datosDescarga = datos.descarga;   
            
            // Crear visualización
            crearGraficoMontania3D(datosGrafica);
            
            // Calcular y mostrar estadísticas
            const stats = calcularEstadistica(datosGrafica);
            entropyValue.textContent = stats.entropia;
            maxProbValue.textContent = stats.maxProb;
            uniformityValue.textContent = stats.uniformidad;

            resultadosSimulacion = datosDescarga;
            parametrosSimulacion = {numDados: numDados, numRepeticiones: numRepeticiones};
            document.getElementById('download-section').style.display = 'block';

            // Actualizar resultados detallados
const datosAMostrar = Math.min(100, datosDescarga.repeticiones.length);
const indicesAMostrar = [];

// Obtener índices de las primeras 100 entradas únicas por repetición
const repeticionesVistas = new Set();
for (let i = 0; i < datosDescarga.repeticiones.length && indicesAMostrar.length < datosAMostrar; i++) {
    const rep = datosDescarga.repeticiones[i];
    if (!repeticionesVistas.has(rep) || repeticionesVistas.size < 20) {
        indicesAMostrar.push(i);
        repeticionesVistas.add(rep);
    }
}

let htmlResultados = `
    <div class="resumen-resultados">
        <p class="resumen-text">
            Mostrando las primeras ${indicesAMostrar.length} entradas de ${datosDescarga.repeticiones.length} totales
        </p>
    </div>
    <div class="resultados-grid">
`;

indicesAMostrar.forEach((index) => {
    const repeticion = datosDescarga.repeticiones[index];
    const cara = datosDescarga.caras[index];
    const frecuencia = datosDescarga.frecuencias[index];
    
    htmlResultados += `
        <div class="resultado-repeticion" title="Repetición ${repeticion}: Cara ${cara} - ${frecuencia} veces">
            R${repeticion}: C${cara} (${frecuencia})
        </div>
    `;
});

htmlResultados += `</div>`;

document.getElementById('resultados-detallados-container').innerHTML = htmlResultados;

// Expandir la tarjeta de resultados
const tarjetaResultados = document.querySelector('.card:has(#resultados-detallados-container)');
if (tarjetaResultados) {
    tarjetaResultados.classList.add('resultados-expandidos');
}
            
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error al generar la visualización 3D: ' + error.message);
        } finally {
            // Ocultar loading
            loadingIndicator.style.display = 'none';
            btnGenerar.disabled = false;
        }
    });


   // Función de descarga (antes del evento 'click' del btnGenerar):
document.getElementById('btnDescargar').addEventListener('click', () => {
    if (!resultadosSimulacion) {
        alert('No hay resultados para descargar');
        return;
    }
    
    // Calcular probabilidades generales de cada cara
    const frecuencias = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0};
    
    // Sumar todas las frecuencias por cara
    resultadosSimulacion.frecuencias.forEach((freq, index) => {
        const cara = resultadosSimulacion.caras[index];
        frecuencias[cara] += freq;
    });
    
    // Calcular total de lanzamientos
    const totalLanzamientos = Object.values(frecuencias).reduce((a, b) => a + b, 0);
    
    // Crear contenido del archivo
    let contenido = '======== SIMULACION MULTINOMIAL ========\n\n';
    contenido += `Parámetros: dados=${parametrosSimulacion.numDados}, repeticiones maximas=${parametrosSimulacion.numRepeticiones}\n\n`;
    
    // Agregar probabilidades generales
    contenido += 'PROBABILIDADES GENERALES:\n';
    for (let i = 1; i <= 6; i++) {
        const probabilidad = totalLanzamientos > 0 ? (frecuencias[i] / totalLanzamientos).toFixed(4) : '0.0000';
        contenido += `Cara ${i}: ${probabilidad}`;
        if (i < 6) contenido += '    ';
    }
    contenido += '\n\nDETALLE POR REPETICIÓN:\n';
    
    // Agregar detalle por repetición
    for (let i = 0; i < resultadosSimulacion.repeticiones.length; i++) {
        contenido += `Repetición ${resultadosSimulacion.repeticiones[i]} - Cara ${resultadosSimulacion.caras[i]}: ${resultadosSimulacion.frecuencias[i]} veces\n`;
    }
    
    // Crear y descargar archivo
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'resultados_multinomial.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
    
    // Generar gráfico inicial al cargar la página
    btnGenerar.click();
});