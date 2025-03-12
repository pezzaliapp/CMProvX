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

  // Crea una riga prodotto racchiusa in un <details> con le opzioni di calcolo e rimozione
  function addProductRow(product) {
    rowCounter++;
    productsSection.style.display = "block";
    globalCostsSection.style.display = "block";

    const categoriaId = `categoria-${product.Codice}-${rowCounter}`;
    const discountId = `discount-${product.Codice}-${rowCounter}`;
    const normalizedCategory = normalizeCategory(product.Categoria);
    let categorySelectHtml = "";
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

    // Associa il pulsante "Calcola" e gli eventi di modifica
    const calcBtn = row.querySelector(".calculateBtn");
    calcBtn.addEventListener("click", function() {
      calculateProduct(row, product);
    });
    const discountInput = row.querySelector(".discount-input");
    discountInput.addEventListener("input", function() {
      calculateProduct(row, product);
    });
    const categoriaSelectElem = row.querySelector(".categoria-select");
    categoriaSelectElem.addEventListener("change", function() {
      calculateProduct(row, product);
    });

    // Rimozione del prodotto con aggiornamento dei totali
    const removeBtn = row.querySelector(".removeBtn");
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

  // Funzione per calcolare i valori per un prodotto e aggiornare i totali globali
  function calculateProduct(row, product) {
    const prezzoLordo = parseFloat(product.PrezzoLordo);
    const categoriaSelectElem = row.querySelector(".categoria-select");
    const categoria = categoriaSelectElem.value.toLowerCase();
    const discountInput = row.querySelector(".discount-input");
    const discount = parseFloat(discountInput.value);
  
    const netPriceElem = row.querySelector(".netPrice");
    const commissionElem = row.querySelector(".commission");
    const commissionPercentElem = row.querySelector(".commissionPercent");
    const discountedPrice60Elem = row.querySelector(".discountedPrice60");
    const netCompanyElem = row.querySelector(".netCompany");
  
    if (isNaN(prezzoLordo) || isNaN(discount) || prezzoLordo <= 0 || discount < 0 || discount > 100) {
      netPriceElem.innerText = "";
      commissionElem.innerText = "";
      commissionPercentElem.innerText = "";
      discountedPrice60Elem.innerText = "";
      netCompanyElem.innerText = "";
      updateGlobalCost();
      return;
    }
  
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
  
    if (discount > maxDiscount) {
      netPriceElem.innerText = "NON AUTORIZZATO";
      commissionElem.innerText = "NON AUTORIZZATO";
      commissionPercentElem.innerText = "NON AUTORIZZATO";
      discountedPrice60Elem.innerText = "NON AUTORIZZATO";
      netCompanyElem.innerText = "NON AUTORIZZATO";
      updateGlobalCost();
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
    const trinst = parseFloat(product.TRINST);
    const netCompany = netPrice - totalCommission - trinst;
  
    netPriceElem.innerText = netPrice.toFixed(2) + "€";
    commissionElem.innerText = totalCommission.toFixed(2) + "€";
    commissionPercentElem.innerText = commissionPercent.toFixed(2) + "%";
    discountedPrice60Elem.innerText = discountedPrice60.toFixed(2) + "€";
    netCompanyElem.innerText = netCompany.toFixed(2) + "€";
    updateGlobalCost();
  }
  
  // Il pulsante "Ricalcola Totale" rimane per eventuali aggiornamenti manuali
  calculateGlobalCostsBtn.addEventListener("click", updateGlobalCost);
  
  // Funzione per generare il report TXT (include anche i totali)
  function generateReportText() {
    let report = "Report CMProvX - Calcolo Compensi\n\n";
    const oggi = new Date().toLocaleDateString();
    report += `Data odierna: ${oggi}\n`;
  
    const customerTypeElem = document.getElementById("customerType");
    const customerExistingElem = document.getElementById("customerExisting");
    const customerNameElem = document.getElementById("customerName");
    const shippingAddressElem = document.getElementById("shippingAddress");
  
    let customerReport = "";
    if (customerTypeElem.value === "finale") {
      customerReport += "Tipo Cliente: Cliente Finale\n";
    } else if (customerTypeElem.value === "rivenditore") {
      customerReport += "Tipo Cliente: Rivenditore\n";
    }
    if (customerExistingElem.value === "si") {
      const nome = customerNameElem.value.trim();
      const indirizzo = shippingAddressElem.value.trim();
      customerReport += `Cliente già registrato: ${nome || "Nessun nominativo inserito"}\n`;
      if (indirizzo) {
        customerReport += `Indirizzo di spedizione: ${indirizzo}\n`;
      }
    } else {
      customerReport += "Cliente nuovo da registrare\n";
    }
    report += customerReport + "\n";
  
    // Inizializza totali per il riepilogo del report
    let totalNetCliente = 0;
    let totalNetAzienda = 0;
    let totalCommissions = 0;
  
    const productRows = document.querySelectorAll(".product-row");
    productRows.forEach((row, index) => {
      let summaryText = row.parentElement.querySelector("summary").innerText;
      const prezzoLordo = row.querySelector(".prezzo-lordo").innerText || "0.00€";
      const discount = row.querySelector(".discount-input").value || "0";
      const netPriceText = row.querySelector(".netPrice").innerText || "0.00€";
      const commissionText = row.querySelector(".commission").innerText || "0.00€";
      const discountedPrice60 = row.querySelector(".discountedPrice60").innerText || "0.00€";
      const trinst = row.querySelector(".trinst").innerText || "0.00€";
      const netCompanyText = row.querySelector(".netCompany").innerText || "0.00€";
  
      const netPriceValue = parseFloat(netPriceText.replace("€", "")) || 0;
      const commissionValue = parseFloat(commissionText.replace("€", "")) || 0;
      const netCompanyValue = parseFloat(netCompanyText.replace("€", "")) || 0;
      totalNetCliente += netPriceValue;
      totalCommissions += commissionValue;
      totalNetAzienda += netCompanyValue;
  
      report += `Articolo ${index + 1}: ${summaryText}\n`;
      report += `Prezzo Lordo: ${prezzoLordo}\n`;
      report += `Sconto Applicato: ${discount}%\n`;
      report += `Prezzo Netto: ${netPriceText}\n`;
      report += `Compenso Agente: ${commissionText}\n`;
      report += `Prezzo Lordo Scontato 60%: ${discountedPrice60}\n`;
      report += `Costi Variabili (TRINST): ${trinst}\n`;
      report += `Netto Azienda: ${netCompanyText}\n`;
      report += `----------------------------------------\n`;
    });
  
    report += "\n";
    report += `Prezzo netto Totale Cliente: ${totalNetCliente.toFixed(2)}€\n`;
    report += `Prezzo netto Totale: ${totalNetAzienda.toFixed(2)}€\n`;
    report += `Totale Compensi: ${totalCommissions.toFixed(2)}€\n`;
    return report;
  }
  
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
  
  // Imposta visibilità iniziale per i campi cliente
  if (customerExistingSelect.value === "si") {
    existingCustomerFields.style.display = "block";
    newCustomerFields.style.display = "none";
  } else {
    existingCustomerFields.style.display = "none";
    newCustomerFields.style.display = "block";
  }
});
