// =============================================================================
//  FutureKawa -- Firmware ESP8266 (NodeMCU) -- pilotage a distance
// -----------------------------------------------------------------------------
//  - AUCUNE publication au demarrage : le capteur attend un ordre "Demarrer".
//  - Configuration dynamique via MQTT (topic / capteur / frequence + libelles).
//  - Marche/arret a distance via un canal de commande.
//  - Journalisation detaillee sur la console serie (115200 bauds).
//
//  Deux topics ecoutes :
//    CONFIG_TOPIC    (retenu)     -> contexte : {"topic","capteurId","frequence",
//                                    "pays","exploitation","entrepot","capteur"}
//    COMMANDE_TOPIC  (non retenu) -> {"actif": true|false}  (Demarrer / Arreter)
// =============================================================================

#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

#include "config.h"

// -----------------------------------------------------------------------------
//  CABLAGE
// -----------------------------------------------------------------------------
#define DHT_PIN   D4
#define DHT_TYPE  DHT22
#define OLED_LARGEUR  128
#define OLED_HAUTEUR  64
#define OLED_ADRESSE  0x3C
#define OLED_SDA      D2
#define OLED_SCL      D1

// -----------------------------------------------------------------------------
//  ETAT DYNAMIQUE (modifiable a distance)
// -----------------------------------------------------------------------------
char          topicPublication[96] = "";   // VIDE au depart : aucune publication par defaut
char          capteurIdActif[48]   = "";
char          paysNom[32]          = "";    // libelles, uniquement pour l'affichage console
char          exploitationNom[48]  = "";
char          entrepotNom[48]      = "";
char          capteurNom[48]       = "";
unsigned long intervalleMesureMs   = (unsigned long)FREQUENCE_DEFAUT_S * 1000UL;

bool contexteConfigure = false;   // a-t-on recu un contexte (topic) ?
bool publicationActive = false;   // l'utilisateur a-t-il clique "Demarrer" ?

const unsigned long INTERVALLE_MIN_MS = 2000UL;   // 2 s minimum

// -----------------------------------------------------------------------------
//  OBJETS
// -----------------------------------------------------------------------------
DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient   clientWifi;
PubSubClient clientMqtt(clientWifi);
Adafruit_SSD1306 ecran(OLED_LARGEUR, OLED_HAUTEUR, &Wire, -1);

bool oledPresent = false;
unsigned long dernierMesureMs = 0;

// -----------------------------------------------------------------------------
//  DECLARATIONS
// -----------------------------------------------------------------------------
void connecterWifi();
void assurerConnexionMqtt();
void surMessageRecu(char* topic, byte* payload, unsigned int length);
void traiterConfig(JsonDocument& doc);
void traiterCommande(JsonDocument& doc);
void initialiserOled();
void afficherSurOled(float temperature, float humidite);
void afficherMessageOled(const String& ligne1, const String& ligne2);
void lireEtPublier();

// =============================================================================
//  SETUP
// =============================================================================
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println();
  Serial.println(F("=========================================="));
  Serial.println(F("  FutureKawa - Capteur ESP8266 (pilotable)"));
  Serial.println(F("=========================================="));
  Serial.print(F("[INIT] Identifiant capteur (DEVICE_ID) : ")); Serial.println(DEVICE_ID);
  Serial.print(F("[INIT] Topic de configuration : ")); Serial.println(CONFIG_TOPIC);
  Serial.print(F("[INIT] Topic de commande      : ")); Serial.println(COMMANDE_TOPIC);
  Serial.println(F("[INIT] Publication : ARRETEE (en attente d'un ordre Demarrer)"));

  dht.begin();
  initialiserOled();
  afficherMessageOled("FutureKawa", "Demarrage...");

  connecterWifi();

  clientMqtt.setServer(MQTT_BROKER_IP, MQTT_PORT);
  clientMqtt.setBufferSize(512);
  clientMqtt.setCallback(surMessageRecu);
}

// =============================================================================
//  LOOP
// =============================================================================
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[WIFI] Connexion perdue, nouvelle tentative..."));
    connecterWifi();
  }

  assurerConnexionMqtt();
  clientMqtt.loop();

  // On ne publie QUE si : ordre actif + contexte configure + topic non vide.
  if (publicationActive && contexteConfigure && strlen(topicPublication) > 0) {
    unsigned long maintenant = millis();
    if (maintenant - dernierMesureMs >= intervalleMesureMs) {
      dernierMesureMs = maintenant;
      lireEtPublier();
    }
  }
}

// =============================================================================
//  WI-FI
// =============================================================================
void connecterWifi() {
  Serial.print(F("[WIFI] Connexion au reseau : "));
  Serial.println(WIFI_SSID);
  afficherMessageOled("WiFi...", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long debut = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(F("."));
    if (millis() - debut > 15000) {
      Serial.println(F("\n[WIFI] Toujours pas connecte, nouvelle tentative..."));
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      debut = millis();
    }
  }
  Serial.println();
  Serial.print(F("[WIFI] CONNECTE. Adresse IP : "));
  Serial.println(WiFi.localIP());
  afficherMessageOled("WiFi OK", WiFi.localIP().toString());
}

// =============================================================================
//  MQTT
// =============================================================================
void assurerConnexionMqtt() {
  if (clientMqtt.connected()) return;

  Serial.print(F("[MQTT] Connexion au broker "));
  Serial.print(MQTT_BROKER_IP); Serial.print(F(":")); Serial.print(MQTT_PORT);
  Serial.println(F(" ..."));

  String idClient = String(DEVICE_ID) + "-" + String(WiFi.macAddress());

  if (clientMqtt.connect(idClient.c_str())) {
    Serial.println(F("[MQTT] CONNECTE au broker."));
    clientMqtt.subscribe(CONFIG_TOPIC);
    clientMqtt.subscribe(COMMANDE_TOPIC);
    Serial.print(F("[MQTT] Abonne a : ")); Serial.print(CONFIG_TOPIC);
    Serial.print(F("  et  ")); Serial.println(COMMANDE_TOPIC);
    afficherMessageOled("MQTT OK", publicationActive ? "Publication ON" : "En attente");
  } else {
    Serial.print(F("[MQTT] ECHEC, code = ")); Serial.print(clientMqtt.state());
    Serial.println(F(". Nouvel essai au prochain cycle."));
    afficherMessageOled("MQTT KO", "Reessai...");
    delay(2000);
  }
}

// =============================================================================
//  RECEPTION MQTT : aiguillage config / commande
// =============================================================================
void surMessageRecu(char* topic, byte* payload, unsigned int length) {
  Serial.print(F("\n[MQTT] Message recu sur : ")); Serial.println(topic);

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) {
    Serial.print(F("[MQTT] JSON invalide : ")); Serial.println(err.c_str());
    return;
  }

  if (strcmp(topic, CONFIG_TOPIC) == 0) {
    traiterConfig(doc);
  } else if (strcmp(topic, COMMANDE_TOPIC) == 0) {
    traiterCommande(doc);
  } else {
    Serial.println(F("[MQTT] Topic non gere -> ignore."));
  }
}

// --- Application d'une nouvelle CONFIGURATION (contexte) ---
void traiterConfig(JsonDocument& doc) {
  const char* nouveauTopic = doc["topic"];
  if (nouveauTopic == nullptr || strlen(nouveauTopic) == 0) {
    Serial.println(F("[CONFIG] Champ 'topic' manquant -> configuration ignoree."));
    return;
  }
  strncpy(topicPublication, nouveauTopic, sizeof(topicPublication) - 1);
  topicPublication[sizeof(topicPublication) - 1] = '\0';

  strncpy(capteurIdActif,  doc["capteurId"]    | "", sizeof(capteurIdActif) - 1);
  strncpy(paysNom,         doc["pays"]         | "", sizeof(paysNom) - 1);
  strncpy(exploitationNom, doc["exploitation"] | "", sizeof(exploitationNom) - 1);
  strncpy(entrepotNom,     doc["entrepot"]     | "", sizeof(entrepotNom) - 1);
  strncpy(capteurNom,      doc["capteur"]      | "", sizeof(capteurNom) - 1);
  capteurIdActif[sizeof(capteurIdActif)-1]='\0'; paysNom[sizeof(paysNom)-1]='\0';
  exploitationNom[sizeof(exploitationNom)-1]='\0'; entrepotNom[sizeof(entrepotNom)-1]='\0';
  capteurNom[sizeof(capteurNom)-1]='\0';

  if (doc["frequence"].is<float>() || doc["frequence"].is<int>()) {
    unsigned long ms = (unsigned long)(doc["frequence"].as<float>() * 1000.0f);
    if (ms < INTERVALLE_MIN_MS) ms = INTERVALLE_MIN_MS;
    intervalleMesureMs = ms;
  }

  contexteConfigure = true;

  Serial.println(F("----------------------------------------"));
  Serial.println(F("[CONFIG] NOUVELLE CONFIGURATION RECUE :"));
  Serial.print(F("         Pays         : ")); Serial.println(strlen(paysNom) ? paysNom : "(non precise)");
  Serial.print(F("         Exploitation : ")); Serial.println(strlen(exploitationNom) ? exploitationNom : "(non precise)");
  Serial.print(F("         Entrepot     : ")); Serial.println(strlen(entrepotNom) ? entrepotNom : "(non precise)");
  Serial.print(F("         Capteur      : ")); Serial.println(strlen(capteurNom) ? capteurNom : "(non precise)");
  Serial.print(F("         capteurId    : ")); Serial.println(strlen(capteurIdActif) ? capteurIdActif : "(aucun)");
  Serial.print(F("         Frequence    : ")); Serial.print(intervalleMesureMs / 1000.0, 1); Serial.println(F(" s"));
  Serial.print(F("         Topic publi. : ")); Serial.println(topicPublication);
  Serial.println(F("----------------------------------------"));

  afficherMessageOled("Config recue", topicPublication);
}

// --- Application d'une COMMANDE marche/arret ---
void traiterCommande(JsonDocument& doc) {
  if (!doc["actif"].is<bool>()) {
    Serial.println(F("[COMMANDE] Champ 'actif' manquant -> ignore."));
    return;
  }
  bool actif = doc["actif"].as<bool>();

  if (actif) {
    if (!contexteConfigure || strlen(topicPublication) == 0) {
      Serial.println(F("[COMMANDE] DEMARRER demande, mais AUCUN contexte configure -> rien publie."));
      Serial.println(F("           (envoyez d'abord une configuration depuis l'interface.)"));
      afficherMessageOled("Demarrer ?", "Config manquante");
      return;
    }
    publicationActive = true;
    dernierMesureMs = 0;   // publie tout de suite
    Serial.println(F("[COMMANDE] >>> DEMARRAGE de la publication <<<"));
    Serial.print(F("           Mesures envoyees sur : ")); Serial.println(topicPublication);
    Serial.print(F("           Toutes les ")); Serial.print(intervalleMesureMs / 1000.0, 1); Serial.println(F(" s"));
    afficherMessageOled("Publication", "DEMARREE");
  } else {
    publicationActive = false;
    Serial.println(F("[COMMANDE] <<< ARRET de la publication >>>"));
    afficherMessageOled("Publication", "ARRETEE");
  }
}

// =============================================================================
//  LECTURE + PUBLICATION
// =============================================================================
void lireEtPublier() {
  float humidite    = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (isnan(humidite) || isnan(temperature)) {
    Serial.println(F("[DHT22] Echec de lecture (NaN) -> publication ignoree."));
    afficherMessageOled("DHT22", "Erreur lecture");
    return;
  }

  Serial.print(F("[MESURE] Temperature = ")); Serial.print(temperature, 1);
  Serial.print(F(" C | Humidite = ")); Serial.print(humidite, 1); Serial.println(F(" %"));

  afficherSurOled(temperature, humidite);

  char charge[160];
  if (strlen(capteurIdActif) > 0) {
    snprintf(charge, sizeof(charge),
             "{\"capteurId\": \"%s\", \"temperature\": %.1f, \"humidite\": %.1f}",
             capteurIdActif, temperature, humidite);
  } else {
    snprintf(charge, sizeof(charge),
             "{\"temperature\": %.1f, \"humidite\": %.1f}",
             temperature, humidite);
  }

  if (clientMqtt.publish(topicPublication, charge)) {
    Serial.print(F("[ENVOI ] OK -> ")); Serial.print(topicPublication);
    Serial.print(F(" : ")); Serial.println(charge);
  } else {
    Serial.println(F("[ENVOI ] ECHEC (broker injoignable ?)."));
  }
}

// =============================================================================
//  OLED
// =============================================================================
void initialiserOled() {
  Wire.begin(OLED_SDA, OLED_SCL);
  if (ecran.begin(SSD1306_SWITCHCAPVCC, OLED_ADRESSE)) {
    oledPresent = true;
    Serial.println(F("[OLED] Ecran detecte."));
    ecran.clearDisplay(); ecran.setTextColor(SSD1306_WHITE); ecran.display();
  } else {
    oledPresent = false;
    Serial.println(F("[OLED] Absent -> on continue sans."));
  }
}

void afficherSurOled(float temperature, float humidite) {
  if (!oledPresent) return;
  ecran.clearDisplay();
  ecran.setTextSize(1); ecran.setCursor(0, 0); ecran.println(F("FutureKawa"));
  ecran.setTextSize(2); ecran.setCursor(0, 20);
  ecran.print(temperature, 1); ecran.print((char)247); ecran.println(F("C"));
  ecran.setCursor(0, 44); ecran.print(humidite, 1); ecran.println(F(" %"));
  ecran.display();
}

void afficherMessageOled(const String& ligne1, const String& ligne2) {
  if (!oledPresent) return;
  ecran.clearDisplay(); ecran.setTextSize(1);
  ecran.setCursor(0, 0);  ecran.println(ligne1);
  ecran.setCursor(0, 16); ecran.println(ligne2);
  ecran.display();
}