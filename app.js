document.addEventListener("DOMContentLoaded", function() {
  let productsData = []; // Array per contenere i dati del CSV
  let rowCounter = 0; // Contatore per garantire id univoci per ogni riga
  const importFile = document.getElementById("importFile");
  const searchSection = document.getElementById("search-section");
  const searchInput = document.getElementById("searchInput");
  const productSelect = document.getElementById("productSelect");
  const addProductBtn = document.getElementById("addProductBtn");
  const productsSection = document.getElementById("products-section");
  const productsList = document.getElementById("productsList");
  const globalCostsSection = document.getElementById("global-costs");
  const calculateGlobalCostsBtn = document.getElementById("calculateGlobalCostsBtn");
  const finalGlobalNetElem = document.getElementById("finalGlobalNet");

  // Funzione per normalizzare il valore della categoria
  function normalizeCategory(cat) {
    cat = cat.toLowerCase();
    if (cat.includes("rivenditore")) {
      return "rivenditore";
    } else if (cat.includes("smontagomme")) {
      return "smontagomme";
    } else if (cat.includes("sollevamento")) {
      return "sollevamento";
    }
    return cat;
  }

  // Gestione import CSV tramite PapaParse
  importFile.addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          productsData = results.data;
          console.log("Listino importato:", productsData);
          // Mostra la sezione di ricerca e popola il menu a tendina
          searchSection.style.display = "block";
          populateProductSelect(productsData);
        },
        error: function(err) {
          console.error("Errore durante il parsing del CSV:", err);
          alert("Errore durante l'importazione del listino.");
        }
      });
    }
  });

  // Filtro dinamico per il campo di ricerca
  searchInput.addEventListener("input", function() {
    const query = searchInput.value.toLowerCase();
    const filtered = productsData.filter(product => {
      return product.Codice.toLowerCase().includes(query) ||
             product.Descrizione.toLowerCase().includes(query);
    });
    populateProductSelect(filtered);
  });

  // Popola il menu a tendina con i prodotti (ogni opzione include i dati in un data-attribute)
  function populateProductSelect(products) {
    productSelect.innerHTML = "";
    products.forEach(product => {
      const option = document.createElement("option");
      option.value = product.Codice;
      option.textContent = product.Codice + " - " + product.Descrizione;
      option.setAttribute("data-product", JSON.stringify(product));
      productSelect.appendChild(option);
    });
  }

  // Aggiunge il prodotto selezionato alla lista dei prodotti
  addProductBtn.addEventListener("click", function() {
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    if (!selectedOption) {
      alert("Seleziona un prodotto.");
      return;
    }
    const productData = JSON.parse(selectedOption.getAttribute("data-product"));
    addProductRow(productData);
    searchInput.value = "";
  });

  // Crea una "riga prodotto" con id univoci, dropdown per la categoria e campo per lo sconto
  function addProductRow(product) {
    rowCounter++;
    productsSection.style.display = "block";
    globalCostsSection.style.display = "block";

    // Genera id univoci per il dropdown e il campo sconto
    const categoriaId = `categoria-${product.Codice}-${rowCounter}`;
    const discountId = `discount-${product.Codice}-${rowCounter}`;

    // Normalizza la categoria proveniente dal CSV
    const normalizedCategory = normalizeCategory(product.Categoria);
    let categorySelectHtml = "";
    // Se il CSV indica "rivenditore", il dropdown propone tutte le opzioni;
    // Altrimenti, il dropdown mostra la categoria corrente e l’unica alternativa è "rivenditore"
    if (normalizedCategory === "rivenditore") {
      categorySelectHtml = `
        <select id="${categoriaId}" class="categoria-select">
          <option value="rivenditore" selected>Rivenditore</option>
          <option value="smontagomme">Smontagomme + Equilibratici</option>
          <option value="sollevamento">Sollevamento</option>
        </select>
      `;
    } else {
      categorySelectHtml = `
        <select id="${categoriaId}" class="categoria-select">
          <option value="${normalizedCategory}" selected>${product.Categoria}</option>
          <option value="rivenditore">Rivenditore</option>
        </select>
      `;
    }

    const row = document.createElement("div");
    row.className = "product-row";
    row.innerHTML = `
      <h3>Prodotto: ${product.Codice} - ${product.Descrizione}</h3>
      <p><strong>Prezzo Lordo:</strong> <span class="prezzo-lordo">${parseFloat(product.PrezzoLordo).toFixed(2)}€</span></p>
      <label for="${categoriaId}"><strong>Seleziona la Categoria:</strong></label>
      ${categorySelectHtml}
      <p><strong>Costi Variabili (TRINST):</strong> <span class="trinst">${parseFloat(product.TRINST).toFixed(2)}€</span></p>
      <label for="${discountId}"><strong>Sconto Applicato (%):</strong></label>
      <input type="number" id="${discountId}" class="discount-input" placeholder="Inserisci sconto">
      <button class="calculateBtn">Calcola</button>
      <div class="results">
        <p>Prezzo Netto: <span class="netPrice">0.00€</span></p>
        <p>Compenso Agente: <span class="commission">0.00€</span> (<span class="commissionPercent">0.00%</span>)</p>
        <p>Prezzo Lordo Scontato 60%: <span class="discountedPrice60">0.00€</span></p>
        <p>Netto Azienda: <span class="netCompany">0.00€</span></p>
      </div>
      <hr>
    `;
    productsList.appendChild(row);

    // Associa il pulsante "Calcola" alla funzione di calcolo della riga corrente
    const calcBtn = row.querySelector(".calculateBtn");
    calcBtn.addEventListener("click", function() {
      calculateProduct(row, product);
    });
  }

  // Calcola i valori per il prodotto in base allo sconto inserito e alla categoria selezionata
  function calculateProduct(row, product) {
    const prezzoLordo = parseFloat(product.PrezzoLordo);
    const categoriaSelect = row.querySelector(".categoria-select");
    // La categoria da utilizzare è quella attualmente selezionata nel dropdown
    const categoria = categoriaSelect.value.toLowerCase();
    const discountInput = row.querySelector(".discount-input");
    const discount = parseFloat(discountInput.value);

    const netPriceElem = row.querySelector(".netPrice");
    const commissionElem = row.querySelector(".commission");
    const commissionPercentElem = row.querySelector(".commissionPercent");
    const discountedPrice60Elem = row.querySelector(".discountedPrice60");
    const netCompanyElem = row.querySelector(".netCompany");

    if (isNaN(prezzoLordo) || isNaN(discount) || prezzoLordo <= 0 || discount < 0 || discount > 100) {
      alert("Inserisci valori validi per il prodotto " + product.Codice);
      return;
    }

    // Determina i parametri di calcolo in base alla categoria selezionata
    let baseRate, maxDiscount;
    switch (categoria) {
      case "rivenditore":
        baseRate = 0.01;
        maxDiscount = 60;
        break;
      case "smontagomme":
        baseRate = 0.07;
        maxDiscount = 55;
        break;
      case "sollevamento":
        baseRate = 0.03;
        maxDiscount = 50;
        break;
      default:
        baseRate = 0;
        maxDiscount = 0;
    }

    // Se lo sconto inserito supera il maxDiscount per la categoria, blocca il calcolo
    if (discount > maxDiscount) {
      netPriceElem.innerText = "NON AUTORIZZATO";
      commissionElem.innerText = "NON AUTORIZZATO";
      commissionPercentElem.innerText = "NON AUTORIZZATO";
      discountedPrice60Elem.innerText = "NON AUTORIZZATO";
      netCompanyElem.innerText = "NON AUTORIZZATO";
      return;
    }

    const netPrice = prezzoLordo * (1 - discount / 100);
    const baseNetPrice = prezzoLordo * (1 - maxDiscount / 100);
    const baseCommission = baseNetPrice * baseRate;
    let extraCommission = 0;
    if (discount < maxDiscount) {
      extraCommission = (netPrice - baseNetPrice) * (baseRate / 2);
    }
    const totalCommission = baseCommission + extraCommission;
    const commissionPercent = (totalCommission / netPrice) * 100;
    const discountedPrice60 = prezzoLordo * 0.4;
    // Sottraiamo il costo variabile (TRINST) preso dal CSV
    const trinst = parseFloat(product.TRINST);
    const netCompany = netPrice - totalCommission - trinst;

    netPriceElem.innerText = netPrice.toFixed(2) + "€";
    commissionElem.innerText = totalCommission.toFixed(2) + "€";
    commissionPercentElem.innerText = commissionPercent.toFixed(2) + "%";
    discountedPrice60Elem.innerText = discountedPrice60.toFixed(2) + "€";
    netCompanyElem.innerText = netCompany.toFixed(2) + "€";
  }

  // Calcola il totale "Netto Azienda" sommando i valori di tutte le righe prodotto
  calculateGlobalCostsBtn.addEventListener("click", function() {
    let totalNetCompany = 0;
    const productRows = document.querySelectorAll(".product-row");
    productRows.forEach(row => {
      const netCompanyText = row.querySelector(".netCompany").innerText;
      if (netCompanyText !== "NON AUTORIZZATO") {
        const value = parseFloat(netCompanyText.replace("€", ""));
        if (!isNaN(value)) {
          totalNetCompany += value;
        }
      }
    });
    finalGlobalNetElem.innerText = totalNetCompany.toFixed(2) + "€";
  });
});
