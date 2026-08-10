/* =========================================================
   MATCHPULSE
   SERVICE WORKER + WEB PUSH V1
   ========================================================= */


self.addEventListener(
  "install",
  () => {

    self.skipWaiting();

  }
);


self.addEventListener(
  "activate",
  event => {

    event.waitUntil(
      self.clients.claim()
    );

  }
);



/* =========================================================
   PUSH
   ========================================================= */

self.addEventListener(
  "push",
  event => {

    let payload = {};


    try {

      payload =
        event.data
          ? event.data.json()
          : {};

    } catch {

      payload = {

        title:
          "MatchPulse",

        body:
          event.data
            ? event.data.text()
            : "Nuovo aggiornamento disponibile"

      };

    }


    const title =
      payload.title ||
      "MatchPulse";


    const options = {

      body:
        payload.body ||
        "Nuova promo disponibile.",

      tag:
        payload.tag ||
        "matchpulse-promo",

      renotify:
        true,

      requireInteraction:
        false,

      data: {

        url:
          payload.url ||
          "/?mpOpen=promos",

        promoId:
          payload.promoId ||
          ""

      }

    };


    event.waitUntil(
      self.registration
        .showNotification(
          title,
          options
        )
    );

  }
);



/* =========================================================
   CLICK NOTIFICA
   ========================================================= */

self.addEventListener(
  "notificationclick",
  event => {

    event.notification.close();


    const targetUrl =
      new URL(
        event.notification
          ?.data
          ?.url ||
        "/?mpOpen=promos",
        self.location.origin
      ).href;


    event.waitUntil(

      self.clients
        .matchAll({
          type:
            "window",

          includeUncontrolled:
            true
        })
        .then(
          async windows => {

            for (
              const client of windows
            ) {

              if (
                "focus" in client
              ) {

                await client.focus();


                client.postMessage({
                  type:
                    "MATCHPULSE_OPEN_PROMOS"
                });


                return client;

              }

            }


            if (
              self.clients.openWindow
            ) {

              return self.clients
                .openWindow(
                  targetUrl
                );

            }

          }
        )

    );

  }
);