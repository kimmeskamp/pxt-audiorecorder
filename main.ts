/**
 * Audioaufnahme und -wiedergabe für den Calliope mini
 * Thorsten Kimmeskamp, 28.06.2021
 */

//% weight=100 color=#0fbc11 icon="\uf130" block="Audio-Recorder"
namespace audiorecorder {
	
    export enum samplingraten {
        //% block="2 kHz"
        samplingrate2k = 2000,
        //% block="4 kHz"
        samplingrate4k = 4000
    }

    export enum ausgabepins {
        //% block="P1"
        p1 = 1,
        //% block="P2"
        p2 = 2
    }

	let puffergroesse = 6000
	let audiopuffer = pins.createBuffer(puffergroesse)
	let samplingintervall = 500
	let ausgabepin = AnalogPin.P1


	/**
     * Startet eine Aufnahme über das eingebaute Mikrofon. Die Aufnahmedauer beträgt 3 Sek. bei
     * einer Samplingrate von 2 kHz und 1,5 Sek. bei einer Samplingrate von 4 kHz.
     */
    //% blockId="starteAufnahme" block="starte Aufnahme"
    export function starteAufnahme(): void {
        audiopuffer.fill(0)
		for (let Index = 0; Index < puffergroesse; Index++) {
			audiopuffer.setNumber(NumberFormat.UInt8LE, Index, pins.analogReadPin(AnalogPin.MIC) >> 2)
			control.waitMicros(samplingintervall-101)
		}
    }

    /**
     * Spielt die Aufnahme auf dem gewähltem Ausgabepin ab. Hierzu muss ein externer Lautsprecher
     * oder Kopfhörer zwischen diesem Pin und dem Minus-Pin des Calliope angeschlossen werden.
     */
	//% blockId="spieleAufnahmeAb" block="spiele Aufnahme ab"
    export function spieleAufnahmeAb(): void {
		for (let Index = 0; Index < puffergroesse; Index++) {
			pins.analogWritePin(AnalogPin.P1, audiopuffer.getNumber(NumberFormat.UInt8LE, Index) << 2)
			control.waitMicros(samplingintervall-101)
		}
		pins.analogWritePin(AnalogPin.P1, 0)
    }

    /**
     * Sendet die Aufnahme über die serielle Schnittstelle.
     * Die einzelnen Samples werden als Komma-Zahl im Wertebereich von -1.0 bis 1.0 dargestellt.
     * (ein Sample pro Zeile, passend für die Audacity-Funktion "Werkzeuge/Sample-Datenimport")
     */
    //% blockId="sendeAufnahmeSeriell" block="sende Aufnahme seriell"
    export function sendeAufnahmeSeriell(): void {
        for (let Index = 0; Index < puffergroesse; Index++) {
			serial.writeLine("" + (audiopuffer.getNumber(NumberFormat.UInt8LE, Index)-128)/128)
        }
    }    

    /**
     * Sendet die Aufnahme über Funk. Ein anderer Calliope, auf dem das selbe Programm läuft, speichert
	 * sie automatisch und kann sie dann wiedergeben. Der Empfang ist erkennbar an einem Pfeil nach links im Display.
     * 
     */
    //% blockId="sendeAufnahmeFunk" block="sende Aufnahme über Funk"
    export function sendeAufnahmeFunk(): void {
        radio.sendNumber(-2) // Anfang der Übertragung
        for (let Index = 0; Index < puffergroesse; Index++) {
		    radio.sendNumber(audiopuffer.getNumber(NumberFormat.UInt8LE, Index))
        }
        radio.sendNumber(-1) // Ende der Übertragung
    }


    /**
     * Wählt die Sampling-Rate (2 kHz oder 4 kHz). Eine höhere Sampling-Rate bedeutet eine bessere
	 * Qualität, aber auch eine kürzere Aufnahme-Dauer.
     */
    //% blockId="waehleSamplingrate" block="wähle Sampling-Rate %rate"
    export function waehleSamplingrate(rate: samplingraten): void {
        if (rate == samplingraten.samplingrate2k) {
            samplingintervall = 500
        } else if (rate == samplingraten.samplingrate4k) {
            samplingintervall = 250
        } else {
            samplingintervall = 500 // Standardwert
        }
    }

	
    /**
     * Wählt den Ausgabe-Pin für die Audio-Wiedergabe (P1 oder P2)
     */
    //% blockId="waehleAusgabepin" block="wähle Ausgabe-Pin %pin"	
    export function waehlePin(pin: ausgabepins): void {
        if (pin = ausgabepins.p1) {
            ausgabepin = AnalogPin.P1
        } else if (pin = ausgabepins.p2) {
            ausgabepin = AnalogPin.P2
        } else {
            ausgabepin = AnalogPin.P1 // Standardwert
        }

       	pins.analogWritePin(ausgabepin, 0)
    	pins.analogSetPeriod(ausgabepin, 20)
    }


	// automatischer Empfang der Aufnahme eines anderen Calliope
	let empfangsZaehler = 0
	
    radio.onReceivedNumber(function (receivedNumber: number) {
        if (receivedNumber == -2) { // Anfang der Übertragung
            basic.showIcon(IconNames.ArrowWest)
		} else if (receivedNumber == -1) { // Ende der Übertragung
            basic.clearScreen()
			empfangsZaehler = 0
        } else {
            audiopuffer.setNumber(NumberFormat.UInt8LE, empfangsZaehler, receivedNumber)
			empfangsZaehler++
        }
    })
}