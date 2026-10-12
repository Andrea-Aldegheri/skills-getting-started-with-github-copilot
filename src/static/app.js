document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const activityCards = new Map();

  function addEmptyParticipantsMessage(participantsList) {
    const emptyMessage = document.createElement("li");
    emptyMessage.className = "empty-participants";
    emptyMessage.textContent = "No participants yet";
    participantsList.appendChild(emptyMessage);
  }

  function updateAvailability(activityCard, change) {
    const availability = activityCard.querySelector(".activity-availability");
    const updatedSpots = Number(availability.dataset.spotsLeft) + change;
    availability.dataset.spotsLeft = updatedSpots;
    availability.querySelector("span").textContent = `${updatedSpots} spots left`;
  }

  function createParticipantRow(email, activityName, participantsList, activityCard) {
    const participant = document.createElement("li");
    participant.className = "participant-row";

    const participantEmail = document.createElement("span");
    participantEmail.className = "participant-email";
    participantEmail.textContent = email;
    participant.appendChild(participantEmail);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-participant";
    removeButton.setAttribute("aria-label", `Remove ${email} from ${activityName}`);
    removeButton.title = `Remove ${email}`;
    removeButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" /></svg>`;
    removeButton.addEventListener("click", async () => {
      removeButton.disabled = true;

      try {
        const response = await fetch(
          `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`,
          { method: "DELETE" }
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.detail || "Failed to unregister participant");
        }

        participant.remove();
        if (participantsList.children.length === 0) {
          addEmptyParticipantsMessage(participantsList);
        }
        updateAvailability(activityCard, 1);
      } catch (error) {
        messageDiv.textContent = error.message;
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
        removeButton.disabled = false;
      }
    });
    participant.appendChild(removeButton);

    return participant;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activityCards.clear();

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCards.set(name, activityCard);

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="activity-availability" data-spots-left="${spotsLeft}"><strong>Availability:</strong> <span>${spotsLeft} spots left</span></p>
        `;

        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";

        const participantsHeading = document.createElement("h5");
        participantsHeading.textContent = "Participants";
        participantsSection.appendChild(participantsHeading);

        const participantsList = document.createElement("ul");
        participantsList.className = "participants-list";

        if (details.participants.length === 0) {
          addEmptyParticipantsMessage(participantsList);
        }

        details.participants.forEach((email) => {
          participantsList.appendChild(createParticipantRow(email, name, participantsList, activityCard));
        });
        participantsSection.appendChild(participantsList);
        activityCard.appendChild(participantsSection);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        const activityCard = activityCards.get(activity);
        if (activityCard) {
          const participantsList = activityCard.querySelector(".participants-list");
          participantsList.querySelector(".empty-participants")?.remove();
          participantsList.appendChild(createParticipantRow(email, activity, participantsList, activityCard));
          updateAvailability(activityCard, -1);
        }

        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
