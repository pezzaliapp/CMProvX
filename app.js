document.addEventListener("DOMContentLoaded", function() {
  let productsData = []; // Array per contenere i dati del CSV
  let rowCounter = 0; // Contatore per garantire id univoci per ogni riga
  
  // Elementi principali
  const importFile = document.getElementById("importFile");
  const searchSection = document.getElementById("search-section");
  const searchInput = document.getElementById("searchInput");
  const productSelect = document.getElementById("productSelect");
  const addProductBtn = document.getElementById("addProductBtn");
  const productsSection = document.getElementById("products-section");
  const productsList = document.getElementById("productsList");
  const globalCostsSection = document.getElementById("global-costs");
  const calculateGlobalCostsBtn = document.getElementById("calculateGlobalCostsBtn");
  
  // Elementi per i totali globali
  const finalGlobalNetElem = document.getElementById("finalGlobalNet"); // Netto Azienda Totale
  const finalGlobalNetClientElem = document.getElementById("finalGlobalNetClient"); // Prezzo Netto Totale Cliente

  // Elemento per il Tipo di Pagamento
  const paymentTypeInput = document.getElementById("paymentType");

  // Elementi per la gestione dell'anagrafica cliente
  const showCustomerSectionBtn = document.getElementById("showCustomerSectionBtn");
  const customerSection = document.getElementById("customer-section");
  const toggleCustomerFormBtn = document.getElementById("toggleCustomerFormBtn");
  const customerFormContainer = document.getElementById("customerFormContainer");
  const closeCustomerFormBtn = document.getElementById("closeCustomerFormBtn");
  const customerExistingSelect = document.getElementById("customerExisting");
  const existingCustomerFields = document.getElementById("existingCustomerFields");
  const newCustomerFields = document.getElementById("newCustomerFields");

  // Funzione per normalizzare la categoria
  function normalizeCategory(cat) {
    cat = cat.toLowerCase();
    if (cat.includes("rivenditore")) {
      return "rivenditore";
    } else if (cat.includes("smontagomme")) {
      return "smontagomme";
    } else if (cat.includes("sollevamento")) {
      return "sollevamento";
    } else if (cat.includes("special")) {
      return "special";
    }
    return cat;
  }

  // Import CSV tramite PapaParse
  importFile.addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          productsData = results.data;
          console.log("Listino importato:", productsData);
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

  // Popola il menu a tendina con i prodotti
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

  // Crea una riga prodotto con le opzioni di calcolo e rimozione
  function addProductRow(product) {
    rowCounter++;
    productsSection.style.display = "block";
    globalCostsSection.style.display = "block";

    const normalizedCategory = normalizeCategory(product.Categoria);
    
    // ID univoci
    const categoriaId = `categoria-${product.Codice}-${rowCounter}`;
    const discountId = `discount-${product.Codice}-${rowCounter}`;
    const specialCommissionId = `commission-special-${product.Codice}-${rowCounter}`;
    const specialNetPriceId = `netprice-special-${product.Codice}-${rowCounter}`;

    /*
      Creiamo un <select> con tutte le opzioni di categoria, includendo "special".
      - Se la categoria rilevata dal CSV è "rivenditore", la mettiamo come selected.
      - Altrimenti usiamo la "vera" categoria normalizzata come selected.
    */
    let categorySelectHtml = "";
    if (normalizedCategory === "rivenditore") {
      categorySelectHtml = `
        <select id="${categoriaId}" class="categoria-select">
          <option value="rivenditore" selected>Rivenditore</option>
          <option value="smontagomme">Smontagomme + Equilibratrici</option>
          <option value="sollevamento">Sollevamento</option>
          <option value="special">Special</option>
        </select>
      `;
    } else {
      categorySelectHtml = `
        <select id="${categoriaId}" class="categoria-select">
          <option value="${normalizedCategory}" selected>${product.Categoria}</option>
          <option value="rivenditore">Rivenditore</option>
          <option value="smontagomme">Smontagomme + Equilibratrici</option>
          <option value="sollevamento">Sollevamento</option>
          <option value="special">Special</option>
        </select>
      `;
    }

    /* 
      Nel form visualizziamo di default:
      - Campi sconto (discountInput)
      - Campi "special" (compenso agente, prezzo netto) inizialmente nascosti 
        (se la categoria del CSV non è "special").
    */
    const row = document.createElement("div");
    row.className = "product-row";
    row.innerHTML = `
      <p><strong>Prezzo Lordo:</strong> 
        <span class="prezzo-lordo">${parseFloat(product.PrezzoLordo).toFixed(2)}€</span>
      </p>
      
      <label for="${categoriaId}"><strong>Seleziona la Categoria:</strong></label>
      ${categorySelectHtml}
      
      <p><strong>Costi Variabili (TRINST):</strong> 
        <span class="trinst">${parseFloat(product.TRINST).toFixed(2)}€</span>
      </p>
      
      <!-- Campo sconto (solo per categorie normali) -->
      <label for="${discountId}" class="discount-label">
        <strong>Sconto Applicato (%):</strong>
      </label>
      <input type="number" id="${discountId}" class="discount-input" placeholder="Inserisci sconto">
      
      <!-- Campi dedicati alla categoria "special" (inizialmente nascosti) -->
      <div class="special-fields" style="display:none;">
        <label for="${specialNetPriceId}">
          <strong>Prezzo Netto (cliente) (€):</strong>
        </label>
        <input type="number" id="${specialNetPriceId}" class="special-netprice-input" 
               placeholder="Inserisci prezzo netto cliente">
        
        <label for="${specialCommissionId}">
          <strong>Compenso Agente (€):</strong>
        </label>
        <input type="number" id="${specialCommissionId}" class="special-commission-input" 
               placeholder="Inserisci compenso agente">
      </div>
      
      <button class="calculateBtn">Calcola</button>
      <div class="results">
        <p>Prezzo Netto: <span class="netPrice">0.00€</span></p>
        <p>
          Compenso Agente: <span class="commission">0.00€</span> 
          (<span class="commissionPercent">0.00%</span>)
        </p>
        <p>Prezzo Lordo Scontato 60%: <span class="discountedPrice60">0.00€</span></p>
        <p>Netto Azienda: <span class="netCompany">0.00€</span></p>
        <!-- Mostriamo lo sconto calcolato anche se "special" (inverso) -->
        <p>Sconto calcolato: <span class="computedDiscount">0.00%</span></p>
      </div>
      
      <button class="removeBtn">Rimuovi Prodotto</button>
      <hr>
    `;

    const details = document.createElement("details");
    details.className = "product-details";
    const summary = document.createElement("summary");
    summary.innerHTML = `<strong>Prodotto: ${product.Codice} - ${product.Descrizione}</strong>`;
    details.appendChild(summary);
    details.appendChild(row);

    productsList.appendChild(details);

    // Recupera i riferimenti agli input/pulsanti
    const categoriaSelectElem = row.querySelector(".categoria-select");
    const discountLabel = row.querySelector(".discount-label");
    const discountInput = row.querySelector(".discount-input");
    const specialFieldsDiv = row.querySelector(".special-fields");
    const specialNetPriceInput = row.querySelector(".special-netprice-input");
    const specialCommissionInput = row.querySelector(".special-commission-input");
    const calcBtn = row.querySelector(".calculateBtn");
    const removeBtn = row.querySelector(".removeBtn");

    // Se il prodotto importato è già "special", sblocchiamo subito i campi special
    if (normalizedCategory === "special") {
      // Nascondi i campi di sconto
      discountLabel.style.display = "none";
      discountInput.style.display = "none";
      // Mostra i campi "special"
      specialFieldsDiv.style.display = "block";
    }

    // Gestione dell'evento "change" su select categoria
    categoriaSelectElem.addEventListener("change", function() {
      if (this.value === "special") {
        // Nascondi i campi di sconto
        discountLabel.style.display = "none";
        discountInput.style.display = "none";
        // Mostra i campi "special"
        specialFieldsDiv.style.display = "block";
      } else {
        // Mostra i campi di sconto
        discountLabel.style.display = "inline-block";
        discountInput.style.display = "inline-block";
        // Nascondi i campi "special"
        specialFieldsDiv.style.display = "none";
      }
      calculateProduct(row, product);
    });

    // Eventi sugli input che possono influenzare il calcolo
    discountInput.addEventListener("input", function() {
      calculateProduct(row, product);
    });
    specialNetPriceInput.addEventListener("input", function() {
      calculateProduct(row, product);
    });
    specialCommissionInput.addEventListener("input", function() {
      calculateProduct(row, product);
    });

    // Pulsante di calcolo
    calcBtn.addEventListener("click", function() {
      calculateProduct(row, product);
    });

    // Rimozione del prodotto con aggiornamento dei totali
    removeBtn.addEventListener("click", function() {
      if (confirm("Sei sicuro di voler rimuovere questo prodotto?")) {
        productsList.removeChild(details);
        updateGlobalCost();
      }
    });
  }

  // Funzione per aggiornare i totali globali
  function updateGlobalCost() {
    let totalNetClient = 0;   // Somma dei Prezzi Netti (Cliente)
    let totalNetCompany = 0;  // Somma dei Netti Azienda
    const productRows = document.querySelectorAll(".product-row");
    productRows.forEach(row => {
      const netPriceText = row.querySelector(".netPrice").innerText;
      const netCompanyText = row.querySelector(".netCompany").innerText;
      if (netPriceText && netPriceText !== "NON AUTORIZZATO") {
        const value = parseFloat(netPriceText.replace("€", "")) || 0;
        totalNetClient += value;
      }
      if (netCompanyText && netCompanyText !== "NON AUTORIZZATO") {
        const value2 = parseFloat(netCompanyText.replace("€", "")) || 0;
        totalNetCompany += value2;
      }
    });
    finalGlobalNetClientElem.innerText = totalNetClient.toFixed(2) + "€";
    finalGlobalNetElem.innerText = totalNetCompany.toFixed(2) + "€";
  }

  // Funzione per calcolare i valori di un singolo prodotto
  function calculateProduct(row, product) {
    const prezzoLordo = parseFloat(product.PrezzoLordo) || 0;
    const trinst = parseFloat(product.TRINST) || 0;

    // Elementi DOM
    const categoriaSelectElem = row.querySelector(".categoria-select");
    const categoria = categoriaSelectElem.value.toLowerCase();
    
    // Campi standard (per rivenditore, smontagomme, sollevamento)
    const discountInput = row.querySelector(".discount-input");

    // Campi special
    const specialNetPriceInput = row.querySelector(".special-netprice-input");
    const specialCommissionInput = row.querySelector(".special-commission-input");

    // Output
    const netPriceElem = row.querySelector(".netPrice");
    const commissionElem = row.querySelector(".commission");
    const commissionPercentElem = row.querySelector(".commissionPercent");
    const discountedPrice60Elem = row.querySelector(".discountedPrice60");
    const netCompanyElem = row.querySelector(".netCompany");
    const computedDiscountElem = row.querySelector(".computedDiscount");

    // Resettiamo i messaggi
    netPriceElem.innerText = "0.00€";
    commissionElem.innerText = "0.00€";
    commissionPercentElem.innerText = "0.00%";
    discountedPrice60Elem.innerText = "0.00€";
    netCompanyElem.innerText = "0.00€";
    computedDiscountElem.innerText = "0.00%";

    // Se prezzoLordo non valido, usciamo
    if (isNaN(prezzoLordo) || prezzoLordo <= 0) {
      netPriceElem.innerText = "";
      commissionElem.innerText = "";
      commissionPercentElem.innerText = "";
      discountedPrice60Elem.innerText = "";
      netCompanyElem.innerText = "";
      computedDiscountElem.innerText = "";
      updateGlobalCost();
      return;
    }

    // Prezzo scontato al 60% (sempre)
    const discountedPrice60 = prezzoLordo * 0.4;
    discountedPrice60Elem.innerText = discountedPrice60.toFixed(2) + "€";

    // Variabili di calcolo
    let netPrice = 0;
    let totalCommission = 0;
    let commissionPercent = 0;
    let discountPercent = 0;
    let maxDiscount;
    let baseRate;

    // Calcolo diversificato
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
      case "special":
        // Nessun limite di sconto
        maxDiscount = 9999; 
        baseRate = 0; // Non serve per "special"
        break;
      default:
        // Se non rientra in nulla, disabilitiamo calcolo
        netPriceElem.innerText = "";
        commissionElem.innerText = "";
        commissionPercentElem.innerText = "";
        discountedPrice60Elem.innerText = "";
        netCompanyElem.innerText = "";
        computedDiscountElem.innerText = "";
        updateGlobalCost();
        return;
    }

    // Se la categoria è diversa da "special", usiamo la logica standard con discountInput
    if (categoria !== "special") {
      const discount = parseFloat(discountInput.value) || 0;

      // Validiamo lo sconto
      if (discount < 0 || discount > 100) {
        netPriceElem.innerText = "";
        commissionElem.innerText = "";
        commissionPercentElem.innerText = "";
        netCompanyElem.innerText = "";
        computedDiscountElem.innerText = "";
        updateGlobalCost();
        return;
      }
      // Se lo sconto supera la soglia massima
      if (discount > maxDiscount) {
        netPriceElem.innerText = "NON AUTORIZZATO";
        commissionElem.innerText = "NON AUTORIZZATO";
        commissionPercentElem.innerText = "NON AUTORIZZATO";
        discountedPrice60Elem.innerText = "NON AUTORIZZATO";
        netCompanyElem.innerText = "NON AUTORIZZATO";
        computedDiscountElem.innerText = "NON AUTORIZZATO";
        updateGlobalCost();
        return;
      }

      // Calcolo standard
      netPrice = prezzoLordo * (1 - discount / 100);
      discountPercent = discount; // quello inserito
      // Calcolo commissioni con baseRate e sconto max
      const baseNetPrice = prezzoLordo * (1 - maxDiscount / 100);
      const baseCommission = baseNetPrice * baseRate;
      let extraCommission = 0;
      if (discount < maxDiscount) {
        extraCommission = (netPrice - baseNetPrice) * (baseRate / 2);
      }
      totalCommission = baseCommission + extraCommission;

      if (netPrice > 0) {
        commissionPercent = (totalCommission / netPrice) * 100;
      }
    } else {
      // Categoria "special"
      // Qui leggiamo i campi "Prezzo Netto" e "Compenso Agente"
      const userNetPrice = parseFloat(specialNetPriceInput.value) || 0;
      const userCommission = parseFloat(specialCommissionInput.value) || 0;

      // Validiamo i campi
      if (userNetPrice <= 0 || userNetPrice > prezzoLordo) {
        // Se il prezzo netto è fuori range, non calcoliamo
        netPriceElem.innerText = "NON VALIDO";
        commissionElem.innerText = "";
        commissionPercentElem.innerText = "";
        discountedPrice60Elem.innerText = "";
        netCompanyElem.innerText = "";
        computedDiscountElem.innerText = "";
        updateGlobalCost();
        return;
      }

      netPrice = userNetPrice;
      totalCommission = userCommission;

      // Calcolo inverso dello sconto
      // sconto = 100 * (1 - (netPrice / prezzoLordo))
      discountPercent = 100 * (1 - netPrice / prezzoLordo);

      // Calcolo percentuale compenso
      if (netPrice > 0) {
        commissionPercent = (totalCommission / netPrice) * 100;
      }
    }

    // Netto azienda
    const netCompany = netPrice - totalCommission - trinst;

    // Assegnazione valori ai campi
    netPriceElem.innerText = netPrice.toFixed(2) + "€";
    commissionElem.innerText = totalCommission.toFixed(2) + "€";
    commissionPercentElem.innerText = commissionPercent.toFixed(2) + "%";
    netCompanyElem.innerText = netCompany.toFixed(2) + "€";
    computedDiscountElem.innerText = discountPercent.toFixed(2) + "%";

    // Aggiornamento totali globali
    updateGlobalCost();
  }
  
  // Pulsante "Ricalcola Totale"
  calculateGlobalCostsBtn.addEventListener("click", updateGlobalCost);
  
  // Generazione report TXT
  function generateReportText() {
    let report = "Report CMProvX - Calcolo Compensi\n\n";
    const oggi = new Date().toLocaleDateString();
    report += `Data odierna: ${oggi}\n`;
  
    const customerTypeElem = document.getElementById("customerType");
    const customerExistingElem = document.getElementById("customerExisting");
    const customerNameElem = document.getElementById("customerName");
    const shippingAddressElem = document.getElementById("shippingAddress");
  
    let customerReport = "";
    if (customerTypeElem && customerTypeElem.value === "finale") {
      customerReport += "Tipo Cliente: Cliente Finale\n";
    } else if (customerTypeElem && customerTypeElem.value === "rivenditore") {
      customerReport += "Tipo Cliente: Rivenditore\n";
    }
    if (customerExistingElem && customerExistingElem.value === "si") {
      const nome = customerNameElem.value.trim();
      const indirizzo = shippingAddressElem.value.trim();
      customerReport += `Cliente già registrato: ${nome || "Nessun nominativo inserito"}\n`;
      if (indirizzo) {
        customerReport += `Indirizzo di spedizione: ${indirizzo}\n`;
      }
    } else if (customerExistingElem && customerExistingElem.value === "no") {
      customerReport += "Cliente nuovo da registrare\n";
    }
    report += customerReport + "\n";
  
    // Inizializza totali per il riepilogo del report
    let totalNetCliente = 0;
    let totalCommissions = 0;
  
    const productRows = document.querySelectorAll(".product-row");
    productRows.forEach((row, index) => {
      let summaryText = row.parentElement.querySelector("summary").innerText;
      const prezzoLordo = row.querySelector(".prezzo-lordo").innerText || "0.00€";
      const netPriceText = row.querySelector(".netPrice").innerText || "0.00€";
      const commissionText = row.querySelector(".commission").innerText || "0.00€";
      const discountedPrice60 = row.querySelector(".discountedPrice60").innerText || "0.00€";
      const trinst = row.querySelector(".trinst").innerText || "0.00€";
      const netCompanyText = row.querySelector(".netCompany").innerText || "0.00€";
      const computedDiscount = row.querySelector(".computedDiscount").innerText || "0.00%";
  
      const netPriceValue = parseFloat(netPriceText.replace("€", "")) || 0;
      const commissionValue = parseFloat(commissionText.replace("€", "")) || 0;
      totalNetCliente += netPriceValue;
      totalCommissions += commissionValue;
  
      report += `Articolo ${index + 1}: ${summaryText}\n`;
      report += `Prezzo Lordo: ${prezzoLordo}\n`;
      report += `Sconto Applicato: ${computedDiscount}\n`;
      report += `Prezzo Netto (Cliente): ${netPriceText}\n`;
      report += `Compenso Agente: ${commissionText}\n`;
      report += `Prezzo Lordo Scontato 60%: ${discountedPrice60}\n`;
      report += `Costi Variabili (TRINST): ${trinst}\n`;
      report += `Netto Azienda: ${netCompanyText}\n`;
      report += `----------------------------------------\n`;
    });
  
    report += "\n";
    report += `Prezzo netto Totale Cliente: ${totalNetCliente.toFixed(2)}€\n`;
  
    // Inserimento del Tipo di Pagamento nel report
    const paymentTypeValue = paymentTypeInput.value.trim() || "Non specificato";
    report += `Tipo di Pagamento: ${paymentTypeValue}\n`;
  
    report += `Totale Compensi: ${totalCommissions.toFixed(2)}€\n`;
    return report;
  }
  
  // Scarica il file TXT
  document.getElementById("generateTxtReportBtn").addEventListener("click", function() {
    const reportText = generateReportText();
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
  
  // Apri WhatsApp con il testo del report
  document.getElementById("generateWhatsappReportBtn").addEventListener("click", function() {
    const reportText = generateReportText();
    const whatsappUrl = "https://wa.me/?text=" + encodeURIComponent(reportText);
    window.open(whatsappUrl, "_blank");
  });
  
  // Gestione del modulo cliente
  showCustomerSectionBtn.addEventListener("click", function() {
    if (customerSection.style.display === "none" || customerSection.style.display === "") {
      customerSection.style.display = "block";
    } else {
      customerSection.style.display = "none";
    }
  });
  
  toggleCustomerFormBtn.addEventListener("click", function() {
    if (customerFormContainer.style.display === "none" || customerFormContainer.style.display === "") {
      customerFormContainer.style.display = "block";
    } else {
      customerFormContainer.style.display = "none";
    }
  });
  
  closeCustomerFormBtn.addEventListener("click", function() {
    customerFormContainer.style.display = "none";
  });
  
  customerExistingSelect.addEventListener("change", function() {
    if (customerExistingSelect.value === "si") {
      existingCustomerFields.style.display = "block";
      newCustomerFields.style.display = "none";
    } else {
      existingCustomerFields.style.display = "none";
      newCustomerFields.style.display = "block";
    }
  });
  
  // Inizializzazione del form cliente in base al valore di default
  if (customerExistingSelect.value === "si") {
    existingCustomerFields.style.display = "block";
    newCustomerFields.style.display = "none";
  } else {
    existingCustomerFields.style.display = "none";
    newCustomerFields.style.display = "block";
  }
});
