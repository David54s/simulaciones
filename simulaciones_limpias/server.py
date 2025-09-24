# Unificado desde tu script.py original: mismo backend Flask, una sola app.
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import random, math, os
import numpy as np
# from scipy.stats import multivariate_normal

app = Flask(__name__, static_folder='static')
CORS(app)

# Rutas estáticas (sirven index.html y demás páginas desde /static)
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)

# ====== Rutas de simulación (copiadas de tu script.py) ======

########################### Función Binomial Puntual
@app.route('/binomial_puntual', methods=['POST'])
def binomial_puntual():
    n = request.json.get('n', 10)  # Obtener el número de intentos desde el frontend
    p = request.json.get('p', 0.5)  # Probabilidad de éxito (p)
    resultados = []
    for _ in range(n):
        r = random.random()
        if r < p:
            resultados.append("1")  # Cara
        else:
            resultados.append("0")  # Cruz
    return jsonify(resultados=resultados)

####################### Función Exponencial
@app.route('/exponencial', methods=['POST'])
def exponencial():
    n = request.json.get('n', 10)
    lambda_ = request.json.get('lambda', 1)
    muestras = []
    
    # Generar muestras exponenciales
    for _ in range(n):
        U = random.random()
        x = -math.log(1 - U) / lambda_
        muestras.append(x)
    
    # Calcular estadísticas básicas
    max_value = max(muestras) if muestras else 1
    min_value = min(muestras) if muestras else 0
    
    # Calcular el histograma (similar a como lo hace JavaScript)
    num_bins = min(30, max(5, int(math.sqrt(n))))
    bin_width = (max_value - min_value) / num_bins if max_value > min_value else 1
    
    # Crear bins
    bin_edges = [min_value + i * bin_width for i in range(num_bins + 1)]
    bins = [0] * num_bins
    
    # Contar frecuencias
    for valor in muestras:
        bin_index = min(int((valor - min_value) / bin_width), num_bins - 1)
        bins[bin_index] += 1
    
    # Calcular densidad del histograma (área = 1)
    area = bin_width * n
    hist_densidad = [count / area for count in bins]
    
    # Calcular puntos medios de los bins para el histograma
    puntos_medios = [min_value + (i + 0.5) * bin_width for i in range(num_bins)]
    pdf_values = [lambda_ * math.exp(-lambda_ * x) for x in puntos_medios]
    media_muestral = sum(muestras) / n if n > 0 else 0
    media_teorica = 1 / lambda_
    if n > 1:
        varianza_muestral = sum((x - media_muestral) ** 2 for x in muestras) / n
    else:
        varianza_muestral = 0
    varianza_teorica = 1 / (lambda_ ** 2)

    return jsonify(
        muestras=muestras,
        hist_puntos_medios=puntos_medios,
        hist_densidad=hist_densidad,
        pdf_values=pdf_values,
        media_muestral=media_muestral,
        media_teorica=media_teorica,
        varianza_muestral=varianza_muestral,
        varianza_teorica=varianza_teorica
    )


################# Función Multinomial para gráfico 3D (SIN NUMPY)
@app.route('/multinomial_3d', methods=['POST'])
def multinomial_3d():
    n = request.json.get('n', 1)
    max_repeticiones = request.json.get('max_repeticiones', 100)
    puntos_muestra = request.json.get('puntos_muestra', 20)
    
    caras = [1, 2, 3, 4, 5, 6]
    
    # Datos para gráfica (muestreado)
    repeticiones_points_grafica = []
    if puntos_muestra == 1:
        repeticiones_points_grafica = [max_repeticiones]
    else:
        step = max(1, (max_repeticiones - 10) // (puntos_muestra - 1))
        repeticiones_points_grafica = [10 + i * step for i in range(puntos_muestra)]
        if repeticiones_points_grafica[-1] > max_repeticiones:
            repeticiones_points_grafica[-1] = max_repeticiones
    
    # Datos para descarga (completo - limitado para eficiencia)
    if max_repeticiones <= 200:
        repeticiones_points_descarga = list(range(1, max_repeticiones + 1))
    else:
        # Para números muy grandes, usar un muestreo más denso pero manejable
        step_descarga = max(1, max_repeticiones // 100)  # Máximo 100 puntos
        repeticiones_points_descarga = list(range(1, max_repeticiones + 1, step_descarga))
        if repeticiones_points_descarga[-1] != max_repeticiones:
            repeticiones_points_descarga.append(max_repeticiones)
    
    # Función para generar datos
    def generar_datos(repeticiones_list):
        datos = {
            'repeticiones': [],
            'caras': [],
            'frecuencias': [],
            'probabilidades': []
        }
        
        for repeticiones in repeticiones_list:
            freq_acumulada = {cara: 0 for cara in caras}
            for _ in range(repeticiones):
                resultados = {cara: 0 for cara in caras}
                for _ in range(n):
                    resultado = random.choice(caras)
                    resultados[resultado] += 1
                
                for cara, count in resultados.items():
                    freq_acumulada[cara] += count
            
            total_lanzamientos = repeticiones * n
            for cara in caras:
                datos['repeticiones'].append(repeticiones)
                datos['caras'].append(cara)
                datos['frecuencias'].append(freq_acumulada[cara])
                datos['probabilidades'].append(freq_acumulada[cara] / total_lanzamientos)
        
        return datos
    
    # Generar ambos conjuntos de datos
    datos_grafica = generar_datos(repeticiones_points_grafica)
    datos_descarga = generar_datos(repeticiones_points_descarga)
    
    return jsonify({
        'grafica': datos_grafica,
        'descarga': datos_descarga
    })




###################### Función para simulación binomial (empírica)
@app.route('/binomial_simulacion', methods=['POST'])
def binomial_simulacion():
    n = request.json.get('n', 10)  # Número de ensayos por experimento
    p = request.json.get('p', 0.5)  # Probabilidad de éxito
    repeticiones = request.json.get('repeticiones', 100)  # Número de experimentos
    
    # Realizar la simulación
    resultados_experimentos = []
    resultados_detallados = []  # Nueva línea

    for _ in range(repeticiones):
        exitos = 0
        for _ in range(n):
            if random.random() < p:
                exitos += 1
        resultados_experimentos.append(exitos)
        resultados_detallados.append(exitos)  # Nueva línea

    
    # Calcular frecuencia de cada resultado
    freq = {k: 0 for k in range(n+1)}
    for resultado in resultados_experimentos:
        freq[resultado] += 1
    
    # Calcular probabilidades empíricas
    prob_empirica = [freq[k] / repeticiones for k in range(n+1)]
    
    # Calcular distribución teórica para comparación
    def coef_binomial(n, k):
        num, den = 1, 1
        for i in range(k):
            num *= (n - i)
            den *= (i + 1)
        return num // den

    prob_teorica = [coef_binomial(n, k) * (p ** k) * ((1 - p) ** (n - k)) for k in range(n+1)]
    
    return jsonify(
        valores=list(range(n+1)),
        freq_empirica=[freq[k] for k in range(n+1)],
        prob_empirica=prob_empirica,
        prob_teorica=prob_teorica,
        repeticiones=repeticiones,
        resultados_detallados=resultados_detallados  # Nueva línea
    )

############################ Funciones auxiliares para Gibbs Sampling
def muestra_x_dado_y(y):
    u = random.random()
    b = 3.0 * y + 2.0
    raiz = b * b + 4 * u * (6.0 * y + 8.0)
    x = (-b + math.sqrt(raiz)) / 2.0
    return x

def muestra_y_dado_x(x):
    u = random.random()
    b = 4.0 * x + 4.0
    raiz = b * b + 24 * u * (4.0 * x + 10.0)
    y = (-b + math.sqrt(raiz)) / 6.0
    return y


######################## Función para simulación del método de Gebbs
@app.route('/gebbs', methods=['POST'])
def gibbs_sampling():
    data = request.json
    n = data.get('n', 1000)
    burn_in = data.get('burn_in', 1000)
    x0 = data.get('x0', 1.0)
    y0 = data.get('y0', 1.0)
    
    x, y = x0, y0
    xs, ys = [], []
    
    # Almacenar todas las iteraciones para diagnóstico
    todas_las_iteraciones_x = []
    todas_las_iteraciones_y = []
    
    for i in range(burn_in + n):
        # Muestrear de las distribuciones condicionales sin restricción
        x = muestra_x_dado_y(y)
        y = muestra_y_dado_x(x)
        
        # Guardar todas las iteraciones
        todas_las_iteraciones_x.append(x)
        todas_las_iteraciones_y.append(y)
        
        if i >= burn_in:
            # Solo después del burn-in, aplicamos la restricción [0,2]
            x = max(0, min(2, x))
            y = max(0, min(2, y))
            xs.append(x)
            ys.append(y)
    
    return jsonify({
        'xs': xs,
        'ys': ys,
        'todas_iteraciones_x': todas_las_iteraciones_x,
        'todas_iteraciones_y': todas_las_iteraciones_y,
        'burn_in': burn_in
    })

################# Función Normal (Box-Muller)
@app.route('/normal', methods=['POST'])
def normal():
    n = request.json.get('n', 10)
    mu = request.json.get('mu', 0)  # Media
    sigma = request.json.get('sigma', 1)  # Desviación estándar
    
    muestras = []
    # Generar muestras usando Box-Muller
    for i in range(n // 2 + 1):  # Genera pares (puede sobrar una muestra)
        u1 = random.random()
        u2 = random.random()
        z0 = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
        z1 = math.sqrt(-2 * math.log(u1)) * math.sin(2 * math.pi * u2)
        muestras.extend([mu + sigma * z0, mu + sigma * z1])
    
    muestras = muestras[:n]  # Ajustar al número exacto
    
    # Calcular estadísticas
    media_muestral = sum(muestras) / n
    varianza_muestral = sum((x - media_muestral) ** 2 for x in muestras) / n
    
    # Calcular histograma
    max_val = max(muestras)
    min_val = min(muestras)
    num_bins = min(30, max(5, int(math.sqrt(n))))
    bin_width = (max_val - min_val) / num_bins
    
    bins = [0] * num_bins
    for valor in muestras:
        idx = min(int((valor - min_val) / bin_width), num_bins - 1)
        bins[idx] += 1
    
    # Densidad del histograma
    area = bin_width * n
    hist_densidad = [count / area for count in bins]
    puntos_medios = [min_val + (i + 0.5) * bin_width for i in range(num_bins)]
    
    # PDF teórica
    pdf_teorica = [
        (1 / (sigma * math.sqrt(2 * math.pi))) * 
        math.exp(-0.5 * ((x - mu) / sigma) ** 2) 
        for x in puntos_medios
    ]
    
    return jsonify(
        muestras=muestras,
        media_muestral=media_muestral,
        varianza_muestral=varianza_muestral,
        media_teorica=mu,
        varianza_teorica=sigma**2,
        hist_puntos_medios=puntos_medios,
        hist_densidad=hist_densidad,
        pdf_teorica=pdf_teorica
    )

####################### NORMAL BIVARIABLE
@app.route('/normal_bivariable', methods=['POST'])
def normal_bivariable():
    try:
        data = request.get_json()
        mu1 = float(data.get('mu1', 0))
        mu2 = float(data.get('mu2', 0))
        sigma1 = float(data.get('sigma1', 1))
        sigma2 = float(data.get('sigma2', 1))
        rho = float(data.get('rho', 0))
        
        # Validar parámetros
        if sigma1 <= 0 or sigma2 <= 0:
            return jsonify({'error': 'Las desviaciones estándar deben ser positivas'}), 400
        
        if abs(rho) >= 1:
            return jsonify({'error': 'El coeficiente de correlación debe estar entre -1 y 1'}), 400
        
        # Crear una malla de puntos (sin usar numpy)
        num_points = 50
        x_min = mu1 - 3 * sigma1
        x_max = mu1 + 3 * sigma1
        y_min = mu2 - 3 * sigma2
        y_max = mu2 + 3 * sigma2
        
        x_step = (x_max - x_min) / (num_points - 1)
        y_step = (y_max - y_min) / (num_points - 1)
        
        # Precalcular constantes para la fórmula
        sigma1_sq = sigma1 * sigma1
        sigma2_sq = sigma2 * sigma2
        rho_sq = rho * rho
        constant_factor = 1 / (2 * math.pi * sigma1 * sigma2 * math.sqrt(1 - rho_sq))
        exponent_denominator = 2 * (1 - rho_sq)
        
        # Preparar datos para superficie 3D y contorno
        superficie = []
        contorno = []
        
        for i in range(num_points):
            x = x_min + i * x_step
            contorno_row = []
            
            for j in range(num_points):
                y = y_min + j * y_step
                
                # Calcular la densidad en el punto (x, y)
                z1 = (x - mu1) / sigma1
                z2 = (y - mu2) / sigma2
                exponent = - (z1*z1 - 2*rho*z1*z2 + z2*z2) / exponent_denominator
                z_value = constant_factor * math.exp(exponent)
                
                # Para la superficie 3D
                superficie.append({
                    'x': float(x),
                    'y': float(y),
                    'z': float(z_value)
                })
                
                # Para el contorno (matriz 2D)
                contorno_row.append(float(z_value))
            
            contorno.append(contorno_row)
        
        return jsonify({
            'superficie': superficie,
            'contorno': contorno,
            'x_range': [float(x_min), float(x_max)],
            'y_range': [float(y_min), float(y_max)]
        })
        
    except Exception as e:
        return jsonify({'error': f'Error en el cálculo: {str(e)}'}), 500

if __name__ == '__main__':
    # Ejecuta un solo servidor Flask. Cambia host/port si lo necesitas.
    app.run(host='127.0.0.1', port=5000, debug=True)
