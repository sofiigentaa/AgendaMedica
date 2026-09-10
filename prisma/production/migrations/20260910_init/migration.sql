-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "telefono" TEXT NOT NULL,
    "fechaNacimiento" TEXT NOT NULL DEFAULT '',
    "coberturaTipo" TEXT NOT NULL,
    "obraSocial" TEXT NOT NULL,
    "numeroAfiliado" TEXT NOT NULL DEFAULT '',
    "notasMedicas" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "pacienteNombre" TEXT NOT NULL,
    "pacienteDni" TEXT NOT NULL,
    "pacienteTelefono" TEXT NOT NULL,
    "pacienteEmail" TEXT NOT NULL DEFAULT '',
    "pacienteFechaNacimiento" TEXT NOT NULL DEFAULT '',
    "coberturaTipo" TEXT NOT NULL,
    "obraSocial" TEXT NOT NULL,
    "numeroAfiliado" TEXT NOT NULL DEFAULT '',
    "fecha" TEXT NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "tratamientoId" TEXT NOT NULL,
    "tratamientoNombre" TEXT NOT NULL,
    "duracionMinutos" INTEGER NOT NULL,
    "horaFin" TEXT NOT NULL,
    "honorarios" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL,
    "estadoPago" TEXT NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "recordatorioEnviado" BOOLEAN NOT NULL DEFAULT false,
    "ultimoRecordatorioAt" TEXT,
    "respuestaPacienteTipo" TEXT,
    "respuestaPacienteAt" TEXT,
    "observaciones" TEXT NOT NULL DEFAULT '',
    "esBloqueo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_history" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "appointmentsCount" INTEGER NOT NULL,
    "patientsCount" INTEGER NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL,
    "jsonData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "nightlyHour" INTEGER NOT NULL DEFAULT 21,
    "nightlyMinute" INTEGER NOT NULL DEFAULT 0,
    "autoDownloadExcel" BOOLEAN NOT NULL DEFAULT false,
    "autoDownloadCsv" BOOLEAN NOT NULL DEFAULT false,
    "saveLocalHistory" BOOLEAN NOT NULL DEFAULT true,
    "lastBackupDate" TEXT,
    "lastBackupTime" TEXT,

    CONSTRAINT "backup_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patients_dni_key" ON "patients"("dni");

-- CreateIndex
CREATE INDEX "appointments_fecha_idx" ON "appointments"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_date_key" ON "holidays"("date");

