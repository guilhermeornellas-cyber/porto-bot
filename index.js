import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars'
    ],
    ignoreDefaultArgs: ['--enable-automation']
  });

  const page = await browser.newPage();

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  try {
    console.log('🚀 Acessando o portal do corretor Porto Seguro...');

    let conectado = false;
    let tentativas = 3;
    while (tentativas > 0 && !conectado) {
      try {
        await page.goto('https://corretor.portoseguro.com.br/portal/site/corretoronline', { waitUntil: 'networkidle2', timeout: 60000 });
        conectado = true;
      } catch (err) {
        tentativas--;
        console.log(`⚠️ Falha ao aceder ao portal. Tentativas restantes: ${tentativas}...`);
        if (tentativas === 0) throw err;
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    console.log('⏳ Aguardando a página carregar...');
    await new Promise(r => setTimeout(r, 4000));

    // PASSO 1: Clicar no botão "ACESSAR O CORRETOR ONLINE"
    console.log('🖱️ Clicando em "Acessar o Corretor Online"...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const target = buttons.find(el => el.textContent.includes('ACESSAR O CORRETOR ONLINE') || el.textContent.includes('Acessar o Corretor Online'));
      if (target) target.click();
    });

    console.log('⏳ Aguardando o modal de login abrir...');
    await new Promise(r => setTimeout(r, 3000));

    // Tratar o pop-up "Sua sessão expirou" caso apareça
    try {
      const btnOkSessao = 'button.ps-btn.ps-btn-primary';
      await page.waitForSelector(btnOkSessao, { visible: true, timeout: 4000 });
      await page.click(btnOkSessao);
      console.log('🧹 Pop-up de sessão expirada fechado.');
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {}

    // PASSO 2: Preencher CPF e Senha
    console.log('⌨️ Preenchendo CPF e Senha...');
    const inputCpf = '#logonPrincipal';
    const inputSenha = 'input[name="password"]';

    await page.waitForSelector(inputCpf, { visible: true, timeout: 15000 });
    await page.type(inputCpf, '105.379.667-65', { delay: 120 });
    await page.type(inputSenha, 'Eng@rde2026', { delay: 120 });

    await new Promise(r => setTimeout(r, 1500));

    console.log('🖱️ Clicando em Entrar...');
    await page.evaluate(() => {
      const btnEntrar = document.querySelector('#inputLogin');
      if (btnEntrar) {
        btnEntrar.focus();
        ['mousedown', 'mouseup', 'click'].forEach(eventType => {
          btnEntrar.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true, view: window }));
        });
      }
    });

    await new Promise(r => setTimeout(r, 3000));

    // PASSO 2.1: Preencher a SUSEP e avançar
    console.log('🔑 Verificando campo de SUSEP...');
    const inputSusep = '#susepsAutocomplete';

    try {
      await page.waitForSelector(inputSusep, { visible: true, timeout: 8000 });
      console.log('⌨️ Preenchendo código SUSEP (4Q37GJ)...');
      await page.type(inputSusep, '4Q37GJ', { delay: 100 });
      await new Promise(r => setTimeout(r, 1000));

      await page.evaluate(() => {
        const btnSusep = document.querySelector('#btnAvancarSusep');
        if (btnSusep) {
          btnSusep.focus();
          ['mousedown', 'mouseup', 'click'].forEach(eventType => {
            btnSusep.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true, view: window }));
          });
        }
      });
      console.log('✅ SUSEP submetida com sucesso!');
    } catch (e) {
      console.log('⚠️ Campo de SUSEP não solicitado ou já avançado.');
    }

    console.log('⏳ Aguardando painel carregar...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {
      console.log('⏳ Navegação concluída, prosseguindo...');
    });

    // -------------------------------------------------------------------------
    // TRATAMENTO DOS MODAIS PÓS-LOGIN
    // -------------------------------------------------------------------------
    console.log('❌ Fechando pop-ups e avisos...');
    try {
      await page.waitForSelector('.icon-Close', { visible: true, timeout: 8000 });
      await page.evaluate(() => {
        const closeIcon = document.querySelector('.icon-Close');
        if (closeIcon) {
          const clickable = closeIcon.closest('button') || closeIcon.closest('div') || closeIcon;
          clickable.click();
        }
      });
    } catch (e) {}

    await new Promise(r => setTimeout(r, 1500));

    try {
      await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('span, button'));
        const removerEls = spans.filter(el => el.textContent.trim() === 'Remover' || el.getAttribute('data-testid') === 'ps-button-label');
        removerEls.forEach(el => {
          const clickable = el.closest('button') || el.closest('a') || el;
          clickable.click();
        });
      });
    } catch (e) {}

    await new Promise(r => setTimeout(r, 2500));

    // -------------------------------------------------------------------------
    // PASSO 3: NAVEGAÇÃO DO MENU (Menu -> Produtos -> Saúde)
    // -------------------------------------------------------------------------
    console.log('🌐 Clicando em "Menu"...');
    await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      const menuSpan = spans.find(el => el.textContent.trim() === 'Menu' && el.getAttribute('data-testid') === 'typography-container');
      if (menuSpan) {
        const clickable = menuSpan.closest('button') || menuSpan.closest('[role="button"]') || menuSpan.parentElement || menuSpan;
        clickable.click();
      } else {
        const anyMenu = spans.find(el => el.textContent.trim() === 'Menu');
        if (anyMenu) anyMenu.click();
      }
    });

    await new Promise(r => setTimeout(r, 2000));

    console.log('🌐 Clicando em "Produtos"...');
    await page.evaluate(() => {
      const prodEl = document.querySelector('div[data-gtm-name="produtos"]') ||
                     document.querySelector('#COL-02TS6') ||
                     Array.from(document.querySelectorAll('div, span')).find(el => el.textContent.trim() === 'Produtos');
      if (prodEl) prodEl.click();
    });

    await new Promise(r => setTimeout(r, 2500));

    console.log('🌐 Clicando em Saúde...');
    const saudeLink = await page.$('a#COL-02X27') || await page.$('[data-gtm-subname="saude:saude"]');
    if (saudeLink) {
      await saudeLink.click();
    } else {
      await page.evaluate(() => {
        const allSaude = Array.from(document.querySelectorAll('a, span, div')).filter(el => el.textContent.trim() === 'Saúde');
        if (allSaude.length > 1) allSaude[1].click();
        else if (allSaude.length === 1) allSaude[0].click();
      });
    }

    console.log('⏳ Aguardando página de Saúde carregar...');
    await new Promise(r => setTimeout(r, 4000));

    // -------------------------------------------------------------------------
    // PASSO 4: Acessar "Resumo da Fatura" (via link ou URL direta)
    // -------------------------------------------------------------------------
    console.log('📄 Procurando e acessando Resumo da Fatura...');
    const seletorResumo = 'a.favorite-link[data-gtm-subname="meus-negocios:resumo-da-fatura"], a[href*="ResumoFaturamentoCol"]';

    let clicouResumo = false;
    for (let tentativa = 0; tentativa < 10; tentativa++) {
      for (const contexto of [page, ...page.frames()]) {
        try {
          const achou = await contexto.evaluate((sel) => {
            const link = document.querySelector(sel) ||
                         Array.from(document.querySelectorAll('a')).find(el => el.textContent.trim() === 'Resumo da Fatura');
            if (link) {
              link.scrollIntoView({ block: 'center' });
              link.click();
              return true;
            }
            return false;
          }, seletorResumo);

          if (achou) {
            clicouResumo = true;
            break;
          }
        } catch (e) {}
      }
      if (clicouResumo) break;
      await page.evaluate(() => window.scrollBy(0, 400));
      await new Promise(r => setTimeout(r, 1000));
    }

    if (!clicouResumo) {
      console.log('⚠️ Link não visível na tela atual, abrindo rota direta do Resumo da Fatura...');
      const urlAtual = page.url();
      const matchSes = urlAtual.match(/sesnum=(\d+)/);
      const sesnum = matchSes ? matchSes[1] : '';
      const urlDireta = `https://corretor.portoseguro.com.br/novocol/iframe?url=https://wwws.portoseguro.com.br/ResumoFaturamentoCol/rfw.aspx?menuid=COL-03TA8%23%23orig=menu_saude&portal=1&corsus=4Q37GJ&webusrcod=4448839&usrtip=S${sesnum ? `&sesnum=${sesnum}` : ''}&cpf=10537966765`;
      await page.goto(urlDireta, { waitUntil: 'networkidle2', timeout: 60000 });
    }

    // -------------------------------------------------------------------------
    // PASSO 5: Capturar o iframe do ResumoFaturamentoCol
    // -------------------------------------------------------------------------
    console.log('⏳ Aguardando o formulário de faturamento carregar...');
    const frameHandle = await page.waitForSelector('iframe[src*="ResumoFaturamentoCol"], iframe[src*="rfw.aspx"]', { timeout: 30000 });
    const frame = await frameHandle.contentFrame();

    await frame.waitForSelector('.selectize-control.ddlEstipulante', { visible: true, timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));

    // -------------------------------------------------------------------------
    // PASSO 6: Mudar filtro superior para "Por estipulante / contratante"
    // -------------------------------------------------------------------------
    console.log('🔄 Alterando filtro para "Por estipulante / contratante"...');
    await frame.click('#bodyContent_ddlTipoFiltro + .selectize-control .selectize-input');
    await frame.waitForSelector('#bodyContent_ddlTipoFiltro + .selectize-control .option[data-value="2"]', { visible: true, timeout: 5000 });
    await frame.click('#bodyContent_ddlTipoFiltro + .selectize-control .option[data-value="2"]');
    await new Promise(r => setTimeout(r, 1000));

    // -------------------------------------------------------------------------
    // PASSO 7: Selecionar o Estipulante (CONTTABILIDADE)
    // -------------------------------------------------------------------------
    const clienteBusca = 'CONTTABILIDADE';
    console.log(`🔍 Selecionando o estipulante: ${clienteBusca}...`);

    await frame.click('.selectize-control.ddlEstipulante .selectize-input');
    await new Promise(r => setTimeout(r, 500));

    await frame.type('.selectize-control.ddlEstipulante .selectize-input input', clienteBusca, { delay: 100 });

    // Aguarda a opção filtrada ficar visível no dropdown
    await frame.waitForFunction((texto) => {
      const opcoes = Array.from(document.querySelectorAll('.selectize-dropdown-content .option'));
      return opcoes.some(el => el.offsetParent !== null && el.textContent.toUpperCase().includes(texto) && el.getAttribute('data-value') !== '0');
    }, { timeout: 10000 }, clienteBusca);

    await new Promise(r => setTimeout(r, 600));

    // 1) Tenta clique real de mouse do Puppeteer na opção visível
    const opcoesHandles = await frame.$$('.selectize-dropdown-content .option');
    for (const handle of opcoesHandles) {
      const ehAlvo = await handle.evaluate((el, texto) => {
        return el.offsetParent !== null &&
               el.textContent.toUpperCase().includes(texto) &&
               el.getAttribute('data-value') !== '0';
      }, clienteBusca);

      if (ehAlvo) {
        await handle.click();
        break;
      }
    }

    await new Promise(r => setTimeout(r, 600));

    // 2) Fallback via API nativa do Selectize caso o clique não tenha fixado o .item
    const itemJaSelecionado = await frame.$('.selectize-control.ddlEstipulante .selectize-input .item');
    if (!itemJaSelecionado) {
      await frame.evaluate((texto) => {
        const selectEl = document.querySelector('#bodyContent_ddlEstipulante');
        if (selectEl && selectEl.selectize) {
          const options = selectEl.selectize.options;
          const matchKey = Object.keys(options).find(k =>
            k !== '0' && String(options[k].text || '').toUpperCase().includes(texto)
          );
          if (matchKey) {
            selectEl.selectize.setValue(matchKey, false);
          }
        }
      }, clienteBusca);
    }

    // Confirma que o item ficou selecionado na caixa antes de seguir
    await frame.waitForSelector('.selectize-control.ddlEstipulante .selectize-input .item', { timeout: 5000 });
    console.log('✅ Estipulante selecionado com sucesso!');

    await new Promise(r => setTimeout(r, 1000));

    // -------------------------------------------------------------------------
    // PASSO 8: Preencher a competência (11/2026)
    // -------------------------------------------------------------------------
    const competencia = '11/2026';
    console.log(`📅 Informando competência: ${competencia}...`);
    await frame.waitForSelector('#bodyContent_mes', { visible: true, timeout: 10000 });
    await frame.click('#bodyContent_mes');
    await frame.type('#bodyContent_mes', competencia, { delay: 90 });

    await new Promise(r => setTimeout(r, 1000));

    // -------------------------------------------------------------------------
    // PASSO 9: Clicar em Consultar e aguardar a tabela de resultados
    // -------------------------------------------------------------------------
    console.log('🖱️ Clicando em Consultar...');
    await frame.click('#bodyContent_lnkConsultar');

    console.log('⏳ Aguardando o resultado da fatura carregar...');
    await frame.waitForFunction(() => {
      return document.body.innerText.includes('BOLETO') && document.body.innerText.includes('COMPETÊNCIA');
    }, { timeout: 30000 });

    console.log('🎉 Consulta concluída! A tabela com PDF, TXT e Boleto já está na tela.');

  } catch (erro) {
    console.error('❌ Erro crítico na automação:', erro.message);
  } finally {
    // await browser.close();
  }
})();