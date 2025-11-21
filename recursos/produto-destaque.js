// Busca e renderiza produtos a partir de produtos.json
        (async function carregarProdutos() {
            const container = document.getElementById('produtosContainer');
            container.classList.add('produtos-container'); // Adiciona classe ao container principal
            const erroEl = document.getElementById('produtosErro');

            try {
                const resp = await fetch('recursos/produtos.json', { cache: 'no-store' });
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                const produtos = await resp.json();

                if (!Array.isArray(produtos) || produtos.length === 0) {
                    container.innerHTML = '<p>Nenhum produto encontrado.</p>';
                    return;
                }

                // Filtra apenas os destaques (opcional)
                const emDestaque = produtos.filter(p => p.destaque !== false);

                container.innerHTML = emDestaque.map(p => {
                    const preco = typeof p.preco === 'number' ? p.preco.toFixed(2) : p.preco;
                    return `
                        <article class="produto-card" role="listitem" aria-labelledby="prod-${p.id}-nome">
                            <div class="produto-imagem">
                                <img src="${p.imagem}" alt="${(p.nome || 'Produto')}" loading="lazy" />
                            </div>
                            <div class="produto-dados">
                                <h3 id="prod-${p.id}-nome">${p.nome}</h3>
                                <p class="produto-descricao">${p.descricao}</p>
                                <div class="produto-rodape">
                                    <span class="produto-preco">R$ ${preco}</span>
                                </div>
                            </div>
                        </article>
                    `;
                }).join('');
            } catch (err) {
                console.error('Erro ao carregar produtos:', err);
                erroEl.hidden = false;
                container.innerHTML = '';
            }
        })();