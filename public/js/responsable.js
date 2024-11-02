let salesData = {};  // Stocke les ventes pour chaque commercial
let chartInstance = null;  // Instance du diagramme en disque

// Authentification de l'utilisateur et récupération de ses informations
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    firebase.firestore().collection("Users").doc(user.uid).get()
      .then((doc) => {
        if (doc.exists && doc.data().role === "responsable") {
          const societeId = doc.data().societeId;
          if (!societeId) {
            console.error("Erreur : societeId est indéfini pour cet utilisateur.");
            alert("Erreur : cet utilisateur n'a pas de société assignée.");
            return;
          }
          console.log("Utilisateur responsable authentifié pour la société :", societeId);
          afficherNomSociete(societeId);  // Affiche le nom de la société
          remplirSelecteurCommerciaux(societeId);  // Remplit le sélecteur de commerciaux
          afficherListeCommerciaux(societeId); // Affiche la liste des commerciaux pour suppression
        } else {
          console.warn("Accès refusé : cet utilisateur n'est pas un responsable.");
          alert("Accès refusé. Cette page est réservée aux responsables.");
          window.location.href = "commercial_dashboard.html";
        }
      })
      .catch((error) => console.error("Erreur lors de la vérification du rôle :", error));
  } else {
    console.log("Utilisateur non authentifié. Redirection vers la page de connexion.");
    window.location.href = "login.html";
  }
});

// Fonction pour afficher le nom de la société
function afficherNomSociete(societeId) {
  firebase.firestore().collection("Societes").doc(societeId).get()
    .then((doc) => {
      if (doc.exists) {
        const nomSociete = doc.data().nom;
        document.getElementById("societeName").textContent = `Société : ${nomSociete}`;
      } else {
        console.warn("Aucune société trouvée avec cet ID.");
      }
    })
    .catch((error) => console.error("Erreur lors de la récupération de la société :", error));
}

// Remplir le sélecteur de commerciaux pour la société spécifique
function remplirSelecteurCommerciaux(societeId) {
  const commercialSelector = document.getElementById("commercialSelector");

  firebase.firestore().collection("Users")
    .where("role", "==", "commercial")
    .where("societeId", "==", societeId)
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((userDoc) => {
        const option = document.createElement("option");
        option.value = userDoc.id;
        option.textContent = userDoc.data().email;
        commercialSelector.appendChild(option);
      });
    })
    .catch((error) => console.error("Erreur lors de la récupération des commerciaux :", error));
}

// Fonction pour afficher la liste des commerciaux sous forme de tableau avec option de suppression
function afficherListeCommerciaux(societeId) {
  const commercialsContainer = document.getElementById("commercialsContainer");
  commercialsContainer.innerHTML = ""; // Réinitialiser le tableau

  firebase.firestore().collection("Users")
    .where("role", "==", "commercial")
    .where("societeId", "==", societeId)
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((userDoc) => {
        const commercial = userDoc.data();
        const commercialId = userDoc.id;

        // Créez la ligne de tableau avec le bouton de suppression
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${commercial.email}</td>
          <td><button onclick="supprimerCommercial('${commercialId}')">Supprimer</button></td>
        `;
        commercialsContainer.appendChild(tr);
      });
    })
    .catch((error) => console.error("Erreur lors de la récupération des commerciaux :", error));
}

// Fonction pour supprimer un commercial et mettre à jour la liste et le sélecteur
function supprimerCommercial(commercialId) {
  if (confirm("Êtes-vous sûr de vouloir supprimer ce commercial ?")) {
    firebase.firestore().collection("Users").doc(commercialId).delete()
      .then(() => {
        console.log("Commercial supprimé avec succès.");
        alert("Commercial supprimé avec succès.");

        // Récupérer l'ID de la société du responsable actuel pour rafraîchir la liste et le sélecteur des commerciaux
        const userId = firebase.auth().currentUser.uid;
        firebase.firestore().collection("Users").doc(userId).get()
          .then((doc) => {
            const societeId = doc.data().societeId;
            
            // Mettre à jour la liste des commerciaux
            afficherListeCommerciaux(societeId);

            // Mettre à jour le sélecteur des commerciaux
            const commercialSelector = document.getElementById("commercialSelector");
            commercialSelector.innerHTML = '<option value="">-- Tous les commerciaux --</option>'; // Réinitialise le sélecteur
            remplirSelecteurCommerciaux(societeId);
          })
          .catch((error) => console.error("Erreur lors de la récupération du societeId :", error));
      })
      .catch((error) => console.error("Erreur lors de la suppression du commercial :", error));
  }
}





// Fonction pour générer les options de sélection pour les commerciaux
function getOptionsCommerciaux() {
  const commercialSelector = document.getElementById("commercialSelector");
  const options = Array.from(commercialSelector.options)
    .map(option => option.value ? `<option value="${option.value}">${option.textContent}</option>` : '')
    .join('');
  return options;
}

















// Fonction pour afficher le rapport en fonction des sélecteurs de commercial et de la plage de dates
function afficherRapport() {
  const commercialId = document.getElementById("commercialSelector").value;
  const startDate = document.getElementById("startDate").value ? new Date(document.getElementById("startDate").value) : null;
  const endDate = document.getElementById("endDate").value ? new Date(document.getElementById("endDate").value) : null;

  if (endDate) {
    endDate.setHours(23, 59, 59, 999);
  }

  const tableRecapCommerciauxBody = document.getElementById("tableRecapCommerciaux").getElementsByTagName("tbody")[0];
  const tableDetailsClientsBody = document.getElementById("tableDetailsClients").getElementsByTagName("tbody")[0];
  const grandTotalElement = document.getElementById("grandTotal");

  firebase.firestore().collection("Users").doc(firebase.auth().currentUser.uid).get()
    .then((doc) => {
      const societeId = doc.data().societeId;
      if (!societeId) {
        console.error("Erreur : societeId est indéfini pour cet utilisateur.");
        alert("Erreur : cet utilisateur n'a pas de société assignée.");
        return;
      }

      tableRecapCommerciauxBody.innerHTML = "";
      tableDetailsClientsBody.innerHTML = "";
      let grandTotal = 0;
      salesData = {};

      firebase.firestore().collection("Users").where("role", "==", "commercial").where("societeId", "==", societeId).get()
        .then((querySnapshot) => {
          querySnapshot.forEach((userDoc) => {
            const commercialName = userDoc.data().email;
            const commercialId = userDoc.id;
            let totalVentes = 0;

            firebase.firestore().collection("Clients").where("userId", "==", commercialId).where("societeId", "==", societeId).get()
              .then((clientSnapshot) => {
                clientSnapshot.forEach((clientDoc) => {
                  const clientData = clientDoc.data();
                  const dateOperation = clientData.createdAt.toDate();

                  if ((!startDate || dateOperation >= startDate) && (!endDate || dateOperation <= endDate)) {
                    totalVentes += clientData.amount;

                    const trClient = document.createElement("tr");
                    trClient.innerHTML = `
                      <td>${commercialName}</td>
                      <td>${clientData.name}</td>
                      <td>${clientData.orderNumber || 'N/A'}</td>
                      <td>${clientData.amount} MAD</td>
                      <td>${dateOperation.toLocaleDateString()}</td>
                      <td>
                        <select onchange="deplacerVente('${clientDoc.id}', this.value)">
                          <option value="">Déplacer vers...</option>
                          ${getOptionsCommerciaux()}
                        </select>
                        <button onclick="supprimerVente('${clientDoc.id}')">Supprimer</button>
                      </td>
                    `;
                    tableDetailsClientsBody.appendChild(trClient);
                  }
                });

                grandTotal += totalVentes;
                salesData[commercialName] = totalVentes;

                const trCommercial = document.createElement("tr");
                trCommercial.innerHTML = `
                  <td>${commercialName}</td>
                  <td>${totalVentes} MAD</td>
                `;
                tableRecapCommerciauxBody.appendChild(trCommercial);

                grandTotalElement.textContent = `${grandTotal} MAD`;
              })
              .catch((error) => console.error("Erreur lors de la récupération des clients :", error));
          });
        })
        .catch((error) => console.error("Erreur lors de la récupération des commerciaux :", error));
    })
    .catch((error) => console.error("Erreur lors de la récupération de l'ID de société :", error));
}

// Fonction pour supprimer une vente
function supprimerVente(venteId) {
  if (confirm("Êtes-vous sûr de vouloir supprimer cette vente ?")) {
    firebase.firestore().collection("Clients").doc(venteId).delete()
      .then(() => {
        console.log("Vente supprimée avec succès.");
        alert("Vente supprimée avec succès.");
        afficherRapport();  // Rafraîchir le tableau
      })
      .catch((error) => console.error("Erreur lors de la suppression de la vente :", error));
  }
}

// Fonction pour déplacer une vente vers un autre commercial
function deplacerVente(venteId, nouveauCommercialId) {
  if (!nouveauCommercialId) {
    alert("Veuillez sélectionner un commercial vers lequel déplacer la vente.");
    return;
  }

  firebase.firestore().collection("Clients").doc(venteId).update({
    userId: nouveauCommercialId
  })
  .then(() => {
    console.log("Vente déplacée avec succès vers un autre commercial.");
    alert("Vente déplacée avec succès.");
    afficherRapport(); // Rafraîchir les tableaux après déplacement
  })
  .catch((error) => console.error("Erreur lors du déplacement de la vente :", error));
}

// Fonction pour générer le diagramme en disque
function genererDiagramme() {
  const labels = Object.keys(salesData);
  const data = Object.values(salesData);
  const grandTotal = parseFloat(document.getElementById("grandTotal").textContent.replace(" MAD", ""));

  if (chartInstance) {
    chartInstance.destroy();
  }

  const ctx = document.getElementById("salesChart").getContext("2d");
  chartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: labels.map(() => `#${Math.floor(Math.random() * 16777215).toString(16)}`),
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: (tooltipItem) => {
              const montant = data[tooltipItem.dataIndex];
              const pourcentage = ((montant / grandTotal) * 100).toFixed(2);
              return `${tooltipItem.label}: ${montant} MAD (${pourcentage}%)`;
            }
          }
        }
      }
    }
  });
}
