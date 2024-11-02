// Fonction pour afficher la première partie de l'email du commercial et le nom de la société
function afficherEmailEtSocieteCommercial() {
  const userId = firebase.auth().currentUser.uid;
  firebase.firestore().collection("Users").doc(userId).get()
    .then((doc) => {
      if (doc.exists) {
        const email = doc.data().email;
        const societeId = doc.data().societeId;  // Récupération du societeId
        const emailPart = email.split('@')[0];
        document.getElementById("commercialName").textContent = `Tableau de Bord de ${emailPart}`;

        // Récupérer et afficher le nom de la société
        firebase.firestore().collection("Societes").doc(societeId).get()
          .then((societeDoc) => {
            if (societeDoc.exists) {
              const nomSociete = societeDoc.data().nom;
              document.getElementById("societeName").textContent = `Société : ${nomSociete}`;
            } else {
              console.warn("Aucune société trouvée avec cet ID.");
            }
          })
          .catch((error) => console.error("Erreur lors de la récupération de la société :", error));
        
        afficherOperationsClients(societeId);  // Passer societeId pour afficher les opérations
      } else {
        console.warn("Aucun utilisateur trouvé avec cet ID dans Firestore.");
      }
    })
    .catch((error) => console.error("Erreur lors de la récupération de l'email du commercial :", error));
}

// Fonction pour ajouter ou modifier un client
function ajouterOuModifierClient(event) {
  event.preventDefault();
  const clientId = document.getElementById("clientId").value;
  const clientName = document.getElementById("clientName").value;
  const clientAmount = parseFloat(document.getElementById("clientAmount").value);
  const orderNumber = document.getElementById("orderNumber").value;
  const userId = firebase.auth().currentUser.uid;

  // Récupérer le societeId de l'utilisateur
  firebase.firestore().collection("Users").doc(userId).get()
    .then((userDoc) => {
      const societeId = userDoc.data().societeId;

      if (clientId) {
        // Mise à jour du client existant
        firebase.firestore().collection("Clients").doc(clientId).update({
          name: clientName,
          amount: clientAmount,
          orderNumber: orderNumber,
          societeId: societeId // Inclure le societeId
        }).then(() => {
          console.log("Client modifié avec succès");
          document.getElementById("addClientForm").reset();
          document.getElementById("clientId").value = "";
          document.getElementById("formTitle").textContent = "Ajouter un Client";
          document.getElementById("submitButton").textContent = "Ajouter Client";
          afficherOperationsClients(societeId);
        }).catch((error) => {
          console.error("Erreur lors de la modification du client :", error);
        });
      } else {
        // Ajout d'un nouveau client
        firebase.firestore().collection("Clients").add({
          name: clientName,
          amount: clientAmount,
          orderNumber: orderNumber,
          userId: userId,
          societeId: societeId, // Inclure le societeId
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
          console.log("Client ajouté avec succès");
          document.getElementById("addClientForm").reset();
          afficherOperationsClients(societeId);
        }).catch((error) => {
          console.error("Erreur lors de l'ajout du client :", error);
        });
      }
    })
    .catch((error) => console.error("Erreur lors de la récupération du societeId :", error));
}

// Fonction pour afficher les opérations des clients et le total des montants avec filtre de dates et de societeId
function afficherOperationsClients(societeId) {
  const userId = firebase.auth().currentUser.uid;
  const tableOperationsClientsBody = document.getElementById("tableOperationsClients").getElementsByTagName("tbody")[0];
  tableOperationsClientsBody.innerHTML = ""; // Réinitialiser le tableau

  let totalAmount = 0; // Initialiser le total des montants

  // Récupération des dates sélectionnées et ajustement pour inclure toute la journée
  const startDate = document.getElementById("startDate").value ? new Date(document.getElementById("startDate").value) : null;
  const endDate = document.getElementById("endDate").value ? new Date(document.getElementById("endDate").value) : null;

  // Ajuster endDate pour inclure toute la journée jusqu'à 23:59:59.999
  if (endDate) {
    endDate.setHours(23, 59, 59, 999);
  }

  // Filtrer par userId et societeId
  firebase.firestore().collection("Clients")
    .where("userId", "==", userId)
    .where("societeId", "==", societeId)
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((clientDoc) => {
        const clientData = clientDoc.data();
        const dateOperation = clientData.createdAt ? clientData.createdAt.toDate() : null;

        // Filtrer par la plage de dates en incluant les dates de début et de fin
        if ((!startDate || (dateOperation && dateOperation >= startDate)) &&
            (!endDate || (dateOperation && dateOperation <= endDate))) {
          totalAmount += clientData.amount;

          const trClient = document.createElement("tr");
          trClient.innerHTML = `
            <td>${clientData.name}</td>
            <td>${clientData.amount} MAD</td>
            <td>${clientData.orderNumber}</td>
            <td>${dateOperation ? dateOperation.toLocaleDateString() : "N/A"}</td>
            <td>
              <button onclick="preparerModificationClient('${clientDoc.id}')">Modifier</button>
              <button onclick="supprimerClient('${clientDoc.id}')">Supprimer</button>
            </td>
          `;
          tableOperationsClientsBody.appendChild(trClient);
        }
      });

      document.getElementById("totalAmount").textContent = `${totalAmount} MAD`;
    })
    .catch((error) => console.error("Erreur lors de la récupération des opérations des clients :", error));
}

// Préparer les valeurs de modification dans le formulaire
function preparerModificationClient(clientId) {
  firebase.firestore().collection("Clients").doc(clientId).get()
    .then((doc) => {
      if (doc.exists) {
        const clientData = doc.data();
        document.getElementById("clientId").value = clientId;
        document.getElementById("clientName").value = clientData.name;
        document.getElementById("clientAmount").value = clientData.amount;
        document.getElementById("orderNumber").value = clientData.orderNumber;
        document.getElementById("formTitle").textContent = "Modifier le Client";
        document.getElementById("submitButton").textContent = "Enregistrer les Modifications";
      } else {
        console.warn("Aucun client trouvé avec cet ID pour modification.");
      }
    })
    .catch((error) => console.error("Erreur lors de la récupération des données du client :", error));
}

// Fonction pour supprimer un client
function supprimerClient(clientId) {
  if (confirm("Êtes-vous sûr de vouloir supprimer cette opération ?")) {
    firebase.firestore().collection("Clients").doc(clientId).delete()
      .then(() => {
        console.log("Client supprimé avec succès");
        afficherEmailEtSocieteCommercial(); // Mettre à jour la liste après suppression
      })
      .catch((error) => console.error("Erreur lors de la suppression du client :", error));
  }
}

// Charger les opérations des clients et afficher l'email du commercial et le nom de la société lors du chargement de la page
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    afficherEmailEtSocieteCommercial();
    document.getElementById("startDate").addEventListener("change", () => {
      afficherEmailEtSocieteCommercial(); // Recharge les opérations avec les nouvelles dates
    });
    document.getElementById("endDate").addEventListener("change", () => {
      afficherEmailEtSocieteCommercial();
    });
  } else {
    console.log("Utilisateur non authentifié. Redirection vers la page de connexion.");
    window.location.href = "login.html";
  }
});
