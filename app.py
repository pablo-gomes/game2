from flask import Flask, render_template, request, jsonify
import requests
import random
import unicodedata
import json


app = Flask(__name__)

cache_times = {}

API_KEY = "cb333b3050914c2c90b8b9c67a24b6eb"

def normalizar(texto):
    if not texto:
        return ""
    return ''.join(
        c for c in unicodedata.normalize('NFD', texto.lower())
        if unicodedata.category(c) != 'Mn'
    ).strip()

with open("times.json", encoding="utf-8") as f:
    ligas = json.load(f)

def pegar_time(dificuldade):

    dificuldade = normalizar(dificuldade)

    if dificuldade not in ligas:
        dificuldade = "facil"

    liga_escolhida = random.choice(ligas[dificuldade])
    liga_id = liga_escolhida["id"]
    liga_nome = liga_escolhida["nome"]

    url = f"https://api.football-data.org/v4/competitions/{liga_id}/teams"

    headers = {
        "X-Auth-Token": API_KEY
    }

    if liga_id not in cache_times:
        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                cache_times[liga_id] = data.get("teams", [])
            else:
                print("Erro API:", response.status_code)
                return None
        except Exception as e:
            print(f"Erro na API: {e}")
            return None

    times = cache_times.get(liga_id)

    if not times:
        return None

    time = random.choice(times)

    escudo = time.get("crest", "")

    if escudo and escudo.startswith("//"):
        escudo = "https:" + escudo

    return {
        "nome": time.get("name"),
        "liga": liga_nome,
        "pais": time.get("area", {}).get("name"),
        "escudo": escudo
    }
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/jogar", methods=["POST"])
def jogar():
    dificuldade = request.json.get("dificuldade", "facil")
    time = pegar_time(dificuldade)

    if time:
        return jsonify(time)
    else:
        return jsonify({"erro": "Erro ao buscar time"}), 500
@app.route("/validar", methods=["POST"])

def validar():
    try:
        dados = request.get_json()
        certo = dados["certo"]

        # Normalizamos tudo para comparar sem acentos e minúsculo
        nome_usuario = normalizar(dados.get("nome", ""))
        liga_usuario = normalizar(dados.get("liga", ""))
        pais_usuario = normalizar(dados.get("pais", ""))

        nome_correto = normalizar(certo.get("nome", ""))
        liga_correta = normalizar(certo.get("liga", ""))
        pais_correto = normalizar(certo.get("pais", ""))
        def limpar_termos(texto):
            lixo = [
                        
                "fc", "cf", "sc", "ac", "afc",
                "club", "clube", "clubes",
                "de", "da", "do", "das", "dos",
                "the", "of",
 
                "futebol", "futebol clube",
                "esporte", "esportes", "esportivo", "esporte clube",
                "associacao", "associação",
                "atletico", "atlético",
                "clube atletico",
                "recreativo",
                "gremio", "grêmio",
                "sociedade",
              
                "football", "soccer",
                "united", "city", "town",
                "rovers", "wanderers",
                "county",
            
                "deportivo",
                "real",
                "club atletico",
                "club deportivo",

                "calcio",
                "associazione",
                "sportiva",

                "sv", "vfb", "borussia",
                "eintracht",
             
                "olympique",
                "stade",
            
                "ajax", 
             
                "internacional",
                "nacional",
                "america", "américa",
                "independiente",
                "olimpico", "olímpico"
                ]
            for palavra in lixo:
                texto = texto.replace(palavra, "")
            return texto.strip()
        acertou_nome = limpar_termos(nome_usuario) in limpar_termos(nome_correto) or limpar_termos(nome_correto) in limpar_termos(nome_usuario)

        acertou_liga = liga_usuario in liga_correta or liga_correta in liga_usuario
        acertou_pais = pais_usuario in pais_correto or pais_correto in pais_usuario or (pais_usuario == "brasil" and pais_correto == "brazil")

        resultado = acertou_nome and acertou_liga and acertou_pais

        return jsonify({"acertou": resultado})

    except Exception as e:
        print("ERRO NO VALIDAR:", e)
        return jsonify({"erro": str(e)}), 500
def nome_bate(usuario, correto):
    usuario = normalizar(usuario)
    correto = normalizar(correto)

    # remove palavras inúteis
    lixo = ["fc", "club", "clube", "de", "the", "sport", "sc"]

    for palavra in lixo:
        usuario = usuario.replace(palavra, "")
        correto = correto.replace(palavra, "")

    usuario = usuario.strip()
    correto = correto.strip()

    resultado = (
        nome_bate(nome_usuario, nome_correto) and
        (liga_usuario == liga_correta or liga_usuario == "") and
        (pais_usuario == pais_correto or pais_usuario == "")
    )

    return jsonify({"acertou": resultado})
@app.route('/estilo')
def estilo():
    return render_template('estilo.html')

@app.route('/dificuldade')
def dificuldade():
    return render_template('dificuldade.html')
@app.route("/ranking")
def ranking():
    modo = request.args.get("modo", "solo")
    return render_template("ranking.html", modo=modo)
@app.route('/jogo')
def jogo():
    dificuldade = request.args.get('dificuldade', 'facil')
    time = pegar_time(dificuldade)  
    return render_template('jogo.html', dificuldade=dificuldade, time=time)

@app.route("/ranking_final")
def ranking_final():
    nome = request.args.get("nome", "Anônimo")
    pontos = request.args.get("pontos", 0)
    modo = request.args.get("modo", "solo")
    return render_template("ranking_final.html", nome=nome, pontos=pontos, modo=modo)

if __name__ == "__main__":
    app.run(debug=True)