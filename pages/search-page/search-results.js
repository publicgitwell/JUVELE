 (function () {
        // Tenta vários caminhos comuns para produtos.json — ajuste conforme a sua estrutura
        const productPaths = [
            '../recursos/produtos.json'
        ];

        // Lê query param q
        const params = new URLSearchParams(window.location.search);
        const qRaw = params.get('q') || '';
        const q = qRaw.trim().toLowerCase();

        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchSubmit');
        const resultsContainer = document.getElementById('searchResultsContainer');
        const inlineResults = document.getElementById('searchResults');

        // Preenche input de busca com o valor de q (se existir)
        if (searchInput && qRaw) searchInput.value = qRaw;

        // Função para montar o HTML do cartão de produto.
        // Ajuste classes/estrutura para bater com central.html, se necessário.
        function buildProductCard(p) {
            // segurança básica: escapar texto
            const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            return `
                <article class="product-card" data-id="${esc(p.id || '')}">
                    <a href="${esc(p.url || '#')}" class="product-link" aria-label="${esc(p.nome)}">
                        <div class="product-image">
                            <img src="${esc(p.imagem || p.image || '')}" alt="${esc(p.nome)}" />
                        </div>
                        <div class="product-info">
                            <h2 class="product-name">${esc(p.nome)}</h2>
                            <p class="product-price">${esc(p.preco || '')}</p>
                        </div>
                    </a>
                </article>
            `;
        }

        // Renderiza mensagem de estado
        function showMessage(msg) {
            resultsContainer.innerHTML = `<p class="search-message">${msg}</p>`;
            inlineResults.setAttribute('aria-hidden', 'true');
        }

        // Filtra produtos pelo campo 'nome'
        function filterProducts(products, term) {
            if (!term) return [];
            return products.filter(p => {
                const nome = (p.nome || '').toString().toLowerCase();
                return nome.includes(term);
            });
        }

        // Tenta buscar produtos.json nos caminhos listados
        async function fetchProducts() {
            for (const path of productPaths) {
                try {
                    const res = await fetch(path);
                    if (!res.ok) continue;
                    const data = await res.json();
                    // assume array no nível raiz ou em data.produtos
                    if (Array.isArray(data)) return data;
                    if (Array.isArray(data.produtos)) return data.produtos;
                } catch (e) {
                    // tenta próximo path
                }
            }
            throw new Error('Não foi possível carregar produtos.json — verifique o caminho.');
        }

        // Executa busca e renderização com base em q
        async function runSearch(term) {
            resultsContainer.innerHTML = ''; // limpa
            inlineResults.setAttribute('aria-hidden', 'true');

            if (!term) {
                showMessage('Digite um termo para buscar produtos.');
                return;
            }

            showMessage('Carregando resultados...');

            try {
                const products = await fetchProducts();
                const found = filterProducts(products, term);

                if (!found.length) {
                    showMessage('Nenhum produto encontrado para a busca: "' + term + '".');
                    return;
                }

                // Monta grid de cartões
                resultsContainer.innerHTML = found.map(buildProductCard).join('');
                inlineResults.setAttribute('aria-hidden', 'true');
            } catch (err) {
                showMessage('Erro ao carregar produtos. Abra o console para mais detalhes.');
                console.error(err);
            }
        }

        // Ao carregar a página, executa busca com q da URL
        document.addEventListener('DOMContentLoaded', () => {
            runSearch(q);
        });

        // Quando clicar no botão Buscar, atualiza a URL e executa a busca
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => {
                const val = searchInput.value.trim();
                const newUrl = new URL(window.location.href);
                if (val) newUrl.searchParams.set('q', val);
                else newUrl.searchParams.delete('q');
                // Atualiza a URL sem recarregar (opcional)
                history.replaceState(null, '', newUrl.toString());
                runSearch(val.toLowerCase());
            });

            // Permitir Enter para buscar
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    searchBtn.click();
                }
            });
        }
    })();