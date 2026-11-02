/* =====================================================
   SPRINGFIELD ARCHIVE

   API:
   https://thesimpsonsapi.com/api/characters

   IMAGENS:
   https://cdn.thesimpsonsapi.com/500

   TECNOLOGIAS:
   HTML + CSS + JAVASCRIPT
===================================================== */


/* =====================================================
   1. CONFIGURAÇÕES DA API
===================================================== */

const API_URL =
    "https://thesimpsonsapi.com/api/characters";

const IMAGE_URL =
    "https://cdn.thesimpsonsapi.com/500";


/* =====================================================
   2. ELEMENTOS DO HTML
===================================================== */

const charactersGrid =
    document.getElementById("characters-grid");

const loadingMessage =
    document.getElementById("loading-message");

const totalCharacters =
    document.getElementById("total-characters");

const searchInput =
    document.getElementById("search-input");

const statusFilter =
    document.getElementById("status-filter");

const favoritesButton =
    document.getElementById("favorites-button");

const favoritesCount =
    document.getElementById("favorites-count");

const favoritesLabel =
    favoritesButton.querySelector(".favorite-label");

const previousButton =
    document.getElementById("previous-button");

const nextButton =
    document.getElementById("next-button");

const pageIndicator =
    document.getElementById("page-indicator");

const charactersSection =
    document.getElementById("personagens");


/* =====================================================
   3. ESTADOS DO PROJETO
===================================================== */

let currentCharacters = [];

let currentPage = 1;

let totalPages = 1;

let nextPageUrl = null;

let previousPageUrl = null;

let showOnlyFavorites = false;

let requestController = null;


/* =====================================================
   4. FAVORITOS SALVOS NO NAVEGADOR
===================================================== */

let favoriteIds = new Set();


try {

    const savedFavorites = JSON.parse(
        localStorage.getItem("springfieldFavorites") || "[]"
    );

    favoriteIds = new Set(
        savedFavorites.map(String)
    );

} catch (error) {

    console.error(
        "Não foi possível carregar os favoritos:",
        error
    );

}


/* =====================================================
   5. FUNÇÕES AUXILIARES
===================================================== */


/* NORMALIZAR TEXTOS */

function normalizeText(text) {

    return String(text || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

}


/* TRADUZIR STATUS */

function translateStatus(status) {

    const normalizedStatus = normalizeText(status);

    const translations = {

        alive: "Vivo",

        dead: "Falecido",

        deceased: "Falecido",

        unknown: "Desconhecido"

    };

    return translations[normalizedStatus] || "Desconhecido";

}


/* TRADUZIR GÊNERO */

function translateGender(gender) {

    const normalizedGender = normalizeText(gender);

    const translations = {

        male: "Masculino",

        female: "Feminino",

        unknown: "Não informado",

        genderless: "Não informado"

    };

    return translations[normalizedGender] || "Não informado";

}


/* EXIBIR CARREGAMENTO */

function showLoading() {

    loadingMessage.classList.remove("hidden");

    charactersGrid.replaceChildren();

}


/* ESCONDER CARREGAMENTO */

function hideLoading() {

    loadingMessage.classList.add("hidden");

}


/* CRIAR MENSAGEM DE ERRO OU VAZIO */

function showMessage(message) {

    const paragraph = document.createElement("p");

    paragraph.className = "empty-message";

    paragraph.textContent = message;

    charactersGrid.replaceChildren(paragraph);

}


/* ATUALIZAR CONTADOR DE FAVORITOS */

function updateFavoritesCounter() {

    favoritesCount.textContent = favoriteIds.size;

}


/* SALVAR FAVORITOS */

function saveFavorites() {

    try {

        localStorage.setItem(
            "springfieldFavorites",
            JSON.stringify([...favoriteIds])
        );

    } catch (error) {

        console.error(
            "Não foi possível salvar os favoritos:",
            error
        );

    }

    updateFavoritesCounter();

}


/* ATUALIZAR ESTADO DO BOTÃO DE FAVORITOS */

function updateFavoritesButton() {

    favoritesButton.classList.toggle(
        "active",
        showOnlyFavorites
    );

    favoritesButton.setAttribute(
        "aria-pressed",
        showOnlyFavorites
    );

    favoritesLabel.textContent = showOnlyFavorites
        ? "♥ Ver todos"
        : "♡ Favoritos";

    updateFavoritesCounter();

}


/* VOLTAR AO PADRÃO DOS FILTROS */

function resetFilters() {

    searchInput.value = "";

    statusFilter.value = "all";

    showOnlyFavorites = false;

    updateFavoritesButton();

}


/* =====================================================
   6. CONSUMO DA API COM FETCH
===================================================== */

async function loadCharacters(page = 1) {

    showLoading();

    previousButton.disabled = true;

    nextButton.disabled = true;


    /*
       CANCELA UMA REQUISIÇÃO ANTERIOR,
       CASO O USUÁRIO CLIQUE RAPIDAMENTE.
    */

    if (requestController) {

        requestController.abort();

    }

    requestController = new AbortController();


    try {

        let requestUrl;


        if (typeof page === "string") {

            requestUrl = page;

        } else {

            requestUrl = `${API_URL}?page=${page}`;

        }


        /*
           FETCH:
           FAZ A REQUISIÇÃO HTTP PARA A API.
        */

        const response = await fetch(
            requestUrl,
            {
                signal: requestController.signal
            }
        );


        if (!response.ok) {

            throw new Error(
                `Erro na requisição: ${response.status}`
            );

        }


        /*
           JSON:
           CONVERTE A RESPOSTA PARA OBJETO JAVASCRIPT.
        */

        const payload = await response.json();


        /*
           A API RETORNA OS PERSONAGENS DENTRO
           DO OBJETO "characters".
        */

        const data = payload.characters || payload;


        if (!Array.isArray(data.results)) {

            throw new Error(
                "Formato de resposta inesperado da API."
            );

        }


        currentCharacters = data.results;


        if (currentCharacters.length === 0) {

            throw new Error(
                "Nenhum personagem foi encontrado nesta página."
            );

        }


        /* ATUALIZAR PÁGINA ATUAL */

        const currentUrl = new URL(requestUrl);

        currentPage = Number(
            currentUrl.searchParams.get("page")
        ) || 1;


        /* ATUALIZAR TOTAL DE PÁGINAS */

        totalPages = Number(data.pages) || 1;


        /* GUARDAR LINKS DE PAGINAÇÃO */

        nextPageUrl = data.next || null;

        previousPageUrl = data.prev || null;


        /* ATUALIZAR TOTAL DE PERSONAGENS */

        if (data.count !== undefined) {

            totalCharacters.textContent =
                Number(data.count).toLocaleString("pt-BR");

        }


        /* CRIAR CARDS DINAMICAMENTE */

        renderCharacters(currentCharacters);


        /* ATUALIZAR PAGINAÇÃO */

        updatePagination();


        /* MENSAGENS NO CONSOLE */

        console.log("API carregada com sucesso!");

        console.log("Resposta completa:", payload);

        console.log("Personagens recebidos:", currentCharacters);

        console.log(
            `${currentCharacters.length} personagens recebidos nesta página.`
        );


    } catch (error) {

        if (error.name === "AbortError") {

            return;

        }


        console.error(
            "Erro ao carregar personagens:",
            error
        );


        showMessage(
            "Não foi possível carregar os personagens. Verifique sua conexão e tente novamente."
        );


        /* BOTÃO PARA TENTAR NOVAMENTE */

        const retryButton = document.createElement("button");

        retryButton.type = "button";

        retryButton.className = "pagination-button";

        retryButton.textContent = "Tentar novamente";

        retryButton.addEventListener("click", () => {

            loadCharacters(currentPage);

        });

        charactersGrid.appendChild(retryButton);


    } finally {

        hideLoading();

        requestController = null;

    }

}


/* =====================================================
   7. CRIAR UM CARD DINAMICAMENTE
===================================================== */

function createCharacterCard(character) {


    /*
       CREATEELEMENT:
       CRIA OS ELEMENTOS DO CARD PELO JAVASCRIPT.
    */

    const card = document.createElement("article");

    card.className = "character-card";


    /* PARTE SUPERIOR DO CARD */

    const cardTop = document.createElement("div");

    cardTop.className = "card-top";


    /* STATUS */

    const normalizedStatus = normalizeText(
        character.status
    );

    const statusBadge = document.createElement("span");

    statusBadge.className = "status-badge";

    statusBadge.textContent =
        translateStatus(character.status);


    if (normalizedStatus === "alive") {

        statusBadge.classList.add("status-alive");

    } else if (
        normalizedStatus === "dead" ||
        normalizedStatus === "deceased"
    ) {

        statusBadge.classList.add("status-dead");

    } else {

        statusBadge.classList.add("status-unknown");

    }


    /* BOTÃO FAVORITO */

    const favoriteButton = document.createElement("button");

    favoriteButton.type = "button";

    favoriteButton.className = "favorite-card-button";


    const alreadyFavorite = favoriteIds.has(
        String(character.id)
    );


    favoriteButton.textContent =
        alreadyFavorite ? "♥" : "♡";


    favoriteButton.classList.toggle(
        "selected",
        alreadyFavorite
    );


    favoriteButton.setAttribute(
        "aria-pressed",
        alreadyFavorite
    );


    favoriteButton.setAttribute(
        "aria-label",
        `Favoritar ${character.name}`
    );


    favoriteButton.addEventListener("click", () => {

        toggleFavorite(character.id);


        const selected = favoriteIds.has(
            String(character.id)
        );


        favoriteButton.textContent =
            selected ? "♥" : "♡";


        favoriteButton.classList.toggle(
            "selected",
            selected
        );


        favoriteButton.setAttribute(
            "aria-pressed",
            selected
        );


        /*
           SE O FILTRO DE FAVORITOS ESTIVER ATIVO,
           ATUALIZA A LISTA AUTOMATICAMENTE.
        */

        if (showOnlyFavorites) {

            renderCharacters(currentCharacters);

        }

    });


    cardTop.appendChild(statusBadge);

    cardTop.appendChild(favoriteButton);


    /* ÁREA DA IMAGEM */

    const imageArea = document.createElement("div");

    imageArea.className = "character-image-area";


    if (character.portrait_path) {

        const characterImage = document.createElement("img");

        characterImage.src =
            IMAGE_URL + character.portrait_path;

        characterImage.alt =
            `Retrato de ${character.name}`;

        characterImage.loading = "lazy";


        characterImage.addEventListener("error", () => {

            characterImage.remove();

            imageArea.textContent =
                "Imagem indisponível";

            imageArea.classList.add("image-missing");

        });


        imageArea.appendChild(characterImage);

    } else {

        imageArea.textContent =
            "Imagem indisponível";

        imageArea.classList.add("image-missing");

    }


    /* CORPO DO CARD */

    const cardBody = document.createElement("div");

    cardBody.className = "card-body";


    /* CATEGORIA */

    const category = document.createElement("span");

    category.className = "card-category";

    category.textContent = "Ficha de personagem";


    /* NOME */

    const name = document.createElement("h3");

    name.textContent =
        character.name || "Personagem sem nome";


    /* IDADE */

    const age = document.createElement("p");

    const ageLabel = document.createElement("strong");

    ageLabel.textContent = "Idade: ";


    age.appendChild(ageLabel);


    const ageValue =
        character.age !== null &&
        character.age !== undefined
            ? `${character.age} anos`
            : "Não informada";


    age.appendChild(
        document.createTextNode(ageValue)
    );


    /* GÊNERO */

    const gender = document.createElement("p");

    const genderLabel = document.createElement("strong");

    genderLabel.textContent = "Gênero: ";


    gender.appendChild(genderLabel);


    gender.appendChild(
        document.createTextNode(
            translateGender(character.gender)
        )
    );


    /* IDENTIFICAÇÃO */

    const identification = document.createElement("p");

    const identificationLabel = document.createElement("strong");

    identificationLabel.textContent = "Código: ";


    identification.appendChild(identificationLabel);


    identification.appendChild(
        document.createTextNode(`#${character.id}`)
    );


    /* INFORMAÇÕES */

    const cardInfo = document.createElement("div");

    cardInfo.className = "card-info";


    cardInfo.appendChild(age);

    cardInfo.appendChild(gender);

    cardInfo.appendChild(identification);


    /* INFORMAÇÃO FINAL EM PORTUGUÊS */

    const note = document.createElement("p");

    note.className = "card-phrase";

    note.textContent =
        "Personagem cadastrado no arquivo de Springfield.";


    /* MONTAGEM DO CARD */

    cardBody.appendChild(category);

    cardBody.appendChild(name);

    cardBody.appendChild(cardInfo);

    cardBody.appendChild(note);


    card.appendChild(cardTop);

    card.appendChild(imageArea);

    card.appendChild(cardBody);


    return card;

}


/* =====================================================
   8. RENDERIZAR OS CARDS NA PÁGINA
===================================================== */

function renderCharacters(characters) {


    const searchTerm = normalizeText(
        searchInput.value
    );


    const selectedStatus = statusFilter.value;


    /* FILTRAR PERSONAGENS */

    const filteredCharacters = characters.filter(
        (character) => {


            const characterName = normalizeText(
                character.name
            );


            const characterStatus = normalizeText(
                character.status || "unknown"
            );


            /* PESQUISA PELO NOME */

            const matchesSearch =
                characterName.includes(searchTerm);


            /* FILTRO DE STATUS */

            let matchesStatus = false;


            if (selectedStatus === "all") {

                matchesStatus = true;

            } else if (selectedStatus === "alive") {

                matchesStatus =
                    characterStatus === "alive";

            } else if (selectedStatus === "dead") {

                matchesStatus =
                    characterStatus === "dead" ||
                    characterStatus === "deceased";

            } else if (selectedStatus === "unknown") {

                matchesStatus =
                    characterStatus === "unknown" ||
                    characterStatus === "";

            }


            /* FILTRO DE FAVORITOS */

            const matchesFavorite =
                !showOnlyFavorites ||
                favoriteIds.has(String(character.id));


            return (
                matchesSearch &&
                matchesStatus &&
                matchesFavorite
            );

        }

    );


    /*
       REMOVE OS CARDS ANTIGOS
       ANTES DE INSERIR OS NOVOS.
    */

    charactersGrid.replaceChildren();


    /* VERIFICAR SE EXISTEM RESULTADOS */

    if (filteredCharacters.length === 0) {

        let message =
            "Nenhum personagem encontrado nesta página.";


        if (showOnlyFavorites) {

            message =
                "Nenhum favorito encontrado nesta página.";

        }


        showMessage(message);

        return;

    }


    /* CRIAR E INSERIR CADA CARD */

    filteredCharacters.forEach((character) => {


        const card = createCharacterCard(character);


        /*
           APPENDCHILD:
           ADICIONA O CARD CRIADO AO HTML.
        */

        charactersGrid.appendChild(card);

    });


    console.log(
        `${filteredCharacters.length} cards criados dinamicamente.`
    );

}


/* =====================================================
   9. CONTROLE DOS FAVORITOS
===================================================== */

function toggleFavorite(characterId) {


    const id = String(characterId);


    if (favoriteIds.has(id)) {

        favoriteIds.delete(id);

    } else {

        favoriteIds.add(id);

    }


    saveFavorites();

}


/* BOTÃO DE FAVORITOS */

favoritesButton.addEventListener("click", () => {


    showOnlyFavorites = !showOnlyFavorites;


    updateFavoritesButton();


    renderCharacters(currentCharacters);

});


/* =====================================================
   10. PESQUISA
===================================================== */

searchInput.addEventListener("input", () => {

    renderCharacters(currentCharacters);

});


/* =====================================================
   11. FILTRO DE STATUS
===================================================== */

statusFilter.addEventListener("change", () => {

    renderCharacters(currentCharacters);

});


/* =====================================================
   12. PAGINAÇÃO
===================================================== */

function updatePagination() {


    previousButton.disabled =
        !previousPageUrl;


    nextButton.disabled =
        !nextPageUrl;


    pageIndicator.textContent =
        `Página ${currentPage} de ${totalPages}`;

}


/* VOLTAR AO INÍCIO DA SEÇÃO DE PERSONAGENS */

function scrollToCharacters() {


    charactersSection.scrollIntoView({

        behavior: "smooth",

        block: "start"

    });

}


/* LIMPAR FILTROS AO TROCAR DE PÁGINA */

function preparePageChange() {

    resetFilters();

}


/* BOTÃO ANTERIOR */

previousButton.addEventListener("click", async () => {


    if (!previousPageUrl) {

        return;

    }


    const destination = previousPageUrl;


    preparePageChange();


    await loadCharacters(destination);


    scrollToCharacters();

});


/* BOTÃO PRÓXIMA */

nextButton.addEventListener("click", async () => {


    if (!nextPageUrl) {

        return;

    }


    const destination = nextPageUrl;


    preparePageChange();


    await loadCharacters(destination);


    scrollToCharacters();

});


/* =====================================================
   13. INICIALIZAÇÃO
===================================================== */


/* ATUALIZAR FAVORITOS */

updateFavoritesButton();


/* CARREGAR PRIMEIRA PÁGINA */

loadCharacters(1);