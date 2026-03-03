// =============================
// CONFIGURAÇÕES INICIAIS
// =============================

const dificuldades = [
    { nome: "FACIL", ata: 20, mei: 50, def: 90, estrelas: 2, img: "/static/img/facil.png" },
    { nome: "MÉDIO", ata: 50, mei: 60, def: 60, estrelas: 3, img: "/static/img/medio.png" },
    { nome: "DIFÍCIL", ata: 80, mei: 70, def: 40, estrelas: 4, img: "/static/img/dificil.png" },
    { nome: "HARDCORE", ata: 95, mei: 85, def: 30, estrelas: 5, img: "/static/img/hard.png" }
];

let pontos = 0;
let erros = 0;
let pulos = 0;
let dicasUsadas = 0;
let timer = null;
let jogoAtivo = false;
let respostaCorreta = null;
let vidas = 9;
let perguntaAtual = 1;
let totalPerguntas = 10;
let indice = 0;
let modo = new URLSearchParams(window.location.search).get("modo") || "solo";
let jogadores = [];
let jogadorAtual = 0;
let maxErros = 20;
let maxPulos = 20;
let maxDicas = 2;

// =============================
// TIMER
// =============================

function iniciarTimer() {
    let tempo = 50;
    const elementoContador = document.getElementById("contador");

    elementoContador.innerText = tempo;

    pararTimer();

    timer = setInterval(() => {
        tempo--;
        elementoContador.innerText = tempo.toString().padStart(2, '0');

        if (tempo <= 0) {
            pararTimer();
            alert("⏰ Tempo esgotado!");
            window.location.href = "/dificuldade";
        }
    }, 1000);
}
function pararTimer() {
    clearInterval(timer);
}

// =============================
// PULAR
// =============================
function pularPergunta() {

    jogoAtivo = true;

    if (pulos >= maxPulos) {
        alert("❌ Você já usou todos os pulos!");
        return;
    }

    pulos++;

    // Atualiza o texto do botão
    const btn = document.getElementById("btn-pular");
    if (btn) {
        btn.textContent = `Pular (${maxPulos - pulos})`;
    }

    // Avança o contador de perguntas
    perguntaAtual++;

    if (perguntaAtual > totalPerguntas) {
        alert("🏁 Fim do jogo!");
        window.location.href = "/dificulade";
        salvarRanking();
        return;
    }

    // Atualiza o número da pergunta na tela
    const elPergunta = document.getElementById("pergunta-atual");
    if (elPergunta) elPergunta.textContent = perguntaAtual;
    iniciarJogo();
}
// =============================
// UTILIDADES
// =============================

function getDificuldade() {
    const params = new URLSearchParams(window.location.search);
    let difUrl = params.get("dificuldade");

    if (difUrl) {
        return difUrl
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    return "FACIL";
}

function mudar(direcao) {
    indice += direcao;

    if (indice < 0) {
        indice = dificuldades.length - 1;
    }

    if (indice >= dificuldades.length) {
        indice = 0;
    }

    const atual = dificuldades[indice];

    document.getElementById("nivel").textContent = atual.nome;
    document.getElementById("ata").textContent = atual.ata;
    document.getElementById("mei").textContent = atual.mei;
    document.getElementById("def").textContent = atual.def;
    document.getElementById("escudo").src = atual.img;

    mostrarEstrelas(atual.estrelas);
}

// =============================
// SISTEMA DE DIFICULDADE
// =============================

function configurarDificuldade() {
    const dificuldade = getDificuldade().toUpperCase();

    if (dificuldade === "FACIL") {
        vidas = 3;
        totalPerguntas = 10;
    }
    else if (dificuldade === "MEDIO") {
        vidas = 3;
        totalPerguntas = 13;
    }
    else if (dificuldade === "DIFICIL") {
        vidas = 3;
        totalPerguntas = 15;
    }
    else if (dificuldade === "HARDCORE") {
        vidas = 0;
        totalPerguntas = 20;
        maxErros = 0;
        maxPulos = 0;
        maxDicas = 0;
    }

    const vidasEl = document.getElementById("vidas");
    const perguntaEl = document.getElementById("pergunta-atual");
    const totalEl = document.getElementById("total-perguntas");

    if (vidasEl) vidasEl.textContent = vidas;
    if (perguntaEl) perguntaEl.textContent = perguntaAtual;
    if (totalEl) totalEl.textContent = totalPerguntas;
}


// =============================
// JOGO
// =============================

function iniciarJogo() {
    jogoAtivo = true;
    const img = document.getElementById("escudo-time");
    if (!img) return;

    configurarDificuldade();
    pararTimer();

    // Limpa os campos para a nova pergunta
    document.getElementById("nome").value = "";
    document.getElementById("liga").value = "";
    document.getElementById("pais").value = "";

    fetch("/jogar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dificuldade: getDificuldade() })
    })
        .then(res => res.json())
        .then(data => {
            if (!data || data.erro) {
                alert("Erro ao carregar time.");
                return;
            }

            respostaCorreta = data;

            // 🔥 ATUALIZA A IMAGEM AQUI
            img.src = data.escudo; // CONFERE se sua API manda "escudo"

            const dificuldade = getDificuldade().toUpperCase();

            img.classList.remove("blur-leve", "blur-forte");

            if (dificuldade === "DIFICIL") {
                img.classList.add("blur-leve");
            }
            else if (dificuldade === "HARDCORE") {
                img.classList.add("blur-forte");
            }

            iniciarTimer();
        })
        .catch(err => console.error("Erro no fetch:", err));
}

// =============================
// VERIFICAR RESPOSTA
// =============================

function verificar() {

    const nome = document.getElementById("nome").value.trim();
    const liga = document.getElementById("liga").value.trim();
    const pais = document.getElementById("pais").value.trim();

    if (!nome || !liga || !pais) {
        alert("Preencha todos os campos!");
        return;
    }

    fetch("/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            nome,
            liga,
            pais,
            certo: respostaCorreta
        })
    })
        .then(res => res.json())
        .then(data => {

            if (data.acertou) {

                pararTimer();
                pontos += 10;

                // 🔥 Se já for a última pergunta, vai direto pro ranking
                if (perguntaAtual === totalPerguntas) {
                    salvarRanking();
                    return;
                }

                // Senão, avança normalmente
                perguntaAtual++;
                document.getElementById("pergunta-atual").textContent = perguntaAtual;

                setTimeout(() => {
                    iniciarJogo();
                }, 800);

            } else {

                if (getDificuldade().toUpperCase() === "HARDCORE") {
                    alert("💀 HARDCORE: Errou = Game Over!");
                    window.location.href = "/dificuldade";
                    return;
                }

                vidas--;
                document.getElementById("vidas").textContent = vidas;

                if (vidas <= 0) {
                    alert("💀 Você perdeu todas as vidas!");
                    window.location.href = "/dificulade";
                    return;
                }

                alert("❌ Resposta incorreta!");
            }

        })
        .catch(err => {
            console.error(err);
            alert("Erro ao validar resposta.");
        });
}

// =============================
// RANKING
// =============================

function salvarRanking() {
    pararTimer();

    const overlay = document.getElementById("overlay-nome");
    const input = document.getElementById("input-nome");

    overlay.style.display = "flex";
    input.focus();

    input.addEventListener("keypress", function (e) {
        if (e.key === "Enter" && input.value.trim() !== "") {
            enviarRanking(input.value.trim());
        }
    });
}
function enviarRanking(nomeJogador) {

    fetch("/ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            nome: nomeJogador,
            pontos: pontos,
            modo: modo
        })
    })
        .then(() => {
            window.location.href = "/ranking";
        })
        .catch(err => console.error("Erro ao salvar ranking:", err));
}
// =============================
// MODO DUO
// =============================

function mostrarResultadoGrupo() {

    jogadores.sort((a, b) => b.pontos - a.pontos);

    let mensagem = "🏆 Resultado Final:\n\n";

    jogadores.forEach((j, i) => {
        mensagem += `${i + 1}º - ${j.nome}: ${j.pontos} pontos\n`;
    });

    alert(mensagem);
}

// =============================
// EVENTOS
// =============================

document.addEventListener("DOMContentLoaded", function () {

    if (modo === "duo") {
        jogadores = [
            { nome: prompt("Nome do Jogador 1:"), pontos: 0 },
            { nome: prompt("Nome do Jogador 2:"), pontos: 0 }
        ];
    }
    const btnPular = document.getElementById("btn-pular");

    if (btnPular) {
        btnPular.addEventListener("click", pularPergunta);
    }

    const botaoJogar = document.querySelector(".botao");

    if (botaoJogar) {
        botaoJogar.addEventListener("click", function () {
            const dificuldadeAtual = dificuldades[indice].nome;
            window.location.href = `/jogo?dificuldade=${dificuldadeAtual}`;
        });
    }

    if (document.getElementById("escudo-time")) {
        iniciarJogo();
    }

    const inputs = document.querySelectorAll('#nome, #liga, #pais');
    inputs.forEach(input => {
        input.addEventListener("keypress", function (e) {
            if (e.key === "Enter") {
                verificar();
            }
        });
    });

});