document.addEventListener('DOMContentLoaded', () => {
    // Menu elements
    const menuIcon = document.querySelector('.menu-icon');
    const menuList = document.getElementById('menuList') || document.querySelector('nav ul');

    // Search elements
    const searchIcon = document.querySelector('.search-icon');
    const form = document.getElementById('siteSearch');
    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');
    const submit = document.getElementById('searchSubmit');

    // Products (loaded from produtos.json)
    let products = [];
    let productsLoaded = false;

    async function loadProducts() {
        try {
            // ajuste o caminho se necessário
            const resp = await fetch('recursos/produtos.json', { cache: 'no-store' });
            if (!resp.ok) throw new Error('fetch error ' + resp.status);
            const data = await resp.json();
            // aceita array raiz ou { products: [...] }
            products = Array.isArray(data) ? data : (data.products || []);
        } catch (err) {
            console.error('Erro ao carregar produtos.json:', err);
            products = [];
        } finally {
            productsLoaded = true;
        }
    }

    // Safety checks
    if (!menuIcon || !menuList) {
        // still wire up search if menu missing
        loadProducts();
        initSearch();
        return;
    }

    const iconElement = menuIcon.querySelector('i');

    function setIconOpen(open) {
        if (iconElement) {
            iconElement.classList.toggle('fa-times', open);
            iconElement.classList.toggle('fa-bars', !open);
        } else {
            menuIcon.textContent = open ? '✕' : '≡';
        }
    }

    menuIcon.addEventListener('click', () => {
        const isOpen = menuList.classList.toggle('open');
        setIconOpen(isOpen);

        if (isOpen) {
            // close search if open
            if (form) {
                form.classList.remove('open');
            }
            if (results) {
                results.classList.remove('open');
                results.setAttribute('aria-hidden', 'true');
            }
        }
    });

    // Close menu when a menu link is clicked
    menuList.addEventListener('click', (e) => {
        if (e.target.tagName.toLowerCase() === 'a') {
            menuList.classList.remove('open');
            setIconOpen(false);
        }
    });

    // Initialize search handlers (also used if menu elements missing)
    function initSearch() {
        if (!form || !input || !results || !searchIcon) return;

        // start loading products once
        loadProducts();

        searchIcon.addEventListener('click', () => {
            const opened = form.classList.toggle('open');

            // when opening search, ensure menu is closed
            if (opened && menuList) {
                if (menuList.classList.contains('open')) {
                    menuList.classList.remove('open');
                    setIconOpen(false);
                }
            }

            // hide results when closing search
            if (!opened) {
                results.classList.remove('open');
                results.setAttribute('aria-hidden', 'true');
            } else {
                results.setAttribute('aria-hidden', 'false');
                input.focus();
            }
        });

        submit.addEventListener('click', (e) => {
            const q = (input.value || '').trim();
            if (!q) return;
            // redireciona para a página de resultados com o termo como query param
            window.location.href = `./search.html?q=${encodeURIComponent(q)}`;
        });
        input.addEventListener('input', debounce(() => performProductSearch(input.value), 220));

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                form.classList.remove('open');
                results.classList.remove('open');
                // also close menu on Escape
                if (menuList) {
                    menuList.classList.remove('open');
                    setIconOpen(false);
                }
            }
        });
    }

    // call to wire search handlers
    initSearch();

    // fechar menu / search ao rolar a página

    /* ---------- product-only search implementation (substituir por este) ---------- */
    function normalizeText(s) {
        return (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    function normalizeName(p) {
        // retorna o nome original e a versão normalizada (sem acentos, minúscula)
        const raw = (p.name || p.nome || p.title || p.titulo || '').toString();
        return { raw, norm: normalizeText(raw) };
    }

    function getProductLink(p) {
        // tenta vários campos comuns; ajuste conforme seu JSON
        if (p.url) return p.url;
        if (p.link) return p.link;
        if (p.href) return p.href;
        if (p.slug) return `/produto/${p.slug}`;
        return null;
    }

    function performProductSearch(query) {
        results.innerHTML = '';

        if (!query || !query.trim()) {
            results.classList.remove('open');
            return;
        }

        const qRaw = query.trim();
        const q = normalizeText(qRaw);

        if (!productsLoaded) {
            results.innerHTML = '<div class="search-item">Carregando produtos...</div>';
            results.classList.add('open');
            return;
        }

        if (!products || products.length === 0) {
            results.innerHTML = '<div class="search-item">Nenhum produto disponível</div>';
            results.classList.add('open');
            return;
        }

        // coletar matches ponderados por posição da palavra e se é prefixo
        const foundMap = new Map(); // product -> bestMatchObj

        products.forEach((p, idx) => {
            const { raw, norm } = normalizeName(p);
            if (!norm) return;

            const words = norm.split(/\s+/).filter(Boolean);
            // procurar em cada palavra na ordem (prioriza palavra 0, depois 1, ...)
            for (let wi = 0; wi < words.length; wi++) {
                const w = words[wi];
                const pos = w.indexOf(q);
                if (pos === -1) continue; // não encontrado nesta palavra

                // score: menor é melhor. Prioriza palavras com menor índice e prefixos (pos === 0)
                const score = wi * 100 + (pos === 0 ? 0 : 20 + pos);
                const prev = foundMap.get(p);
                if (!prev || score < prev.score) {
                    foundMap.set(p, { p, rawName: raw, score, wordIndex: wi, pos });
                }
                // como usuário quer buscar palavra por palavra, se encontramos na palavra atual
                // podemos parar de checar palavras subsequentes? Não: pode haver ocorrência em palavra anterior
                // porém iterando em ordem, primeiras palavras tem melhor score; continuar para obter melhor pos (rare)
            }
        });

        // se não há matches, informar sem resultados
        if (foundMap.size === 0) {
            results.innerHTML = '<div class="search-item">Nenhum resultado</div>';
            results.classList.add('open');
            return;
        }

        // transformar em array, ordenar por score e limitar a 10
        const matches = Array.from(foundMap.values())
            .sort((a, b) => a.score - b.score)
            .slice(0, 10);

        // construir itens de resultado
        matches.forEach(m => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.tabIndex = 0;
            div.innerHTML = highlight(m.rawName, qRaw);
            const link = getProductLink(m.p);
            div.addEventListener('click', () => {
                if (link) {
                    window.location.href = link;
                } else {
                    const el = Array.from(document.querySelectorAll('*')).find(elm => (elm.textContent || '').includes(m.rawName));
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        form.classList.remove('open');
                        results.classList.remove('open');
                    }
                }
            });
            results.appendChild(div);
        });

        results.classList.add('open');
    }

    function highlight(text, qRaw) {
        if (!text) return '';
        // destacar a primeira ocorrência do texto digitado (sem alterar acentos/maiúsculas)
        const normText = normalizeText(text);
        const normQ = normalizeText(qRaw);
        const idx = normText.indexOf(normQ);
        if (idx === -1) return escapeHtml(text.slice(0, 120));
        // usar posições no texto original: calcular offset aproximado
        // estratégia: localizar a substring equivalente no texto original por comparações
        let start = 0, foundAt = -1;
        // percorrer janelas no texto original para achar trecho cuja normalização casa com normQ
        for (let i = 0; i <= text.length - qRaw.length; i++) {
            const slice = text.substr(i, qRaw.length);
            if (normalizeText(slice) === normQ) {
                foundAt = i;
                break;
            }
        }
        if (foundAt === -1) {
            // fallback: achar por posição estimada usando idx na versão normalizada
            // mapear caracteres: percorre e conta equivalência
            let ni = 0, oi = 0;
            while (ni < idx && oi < text.length) {
                if (normalizeText(text[oi])) {
                    ni++;
                }
                oi++;
            }
            foundAt = oi;
        }
        const before = escapeHtml(text.slice(Math.max(0, foundAt - 40), foundAt));
        const match = escapeHtml(text.substr(foundAt, qRaw.length));
        const after = escapeHtml(text.substr(foundAt + qRaw.length, 120));
        return `${before}<mark>${match}</mark>${after}`;
    }

    function escapeHtml(s) {
        return (s || '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function debounce(fn, ms) {
        let t;
        return function (...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), ms);
        };
    }
});