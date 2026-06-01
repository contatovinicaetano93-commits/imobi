-- AddIndex: Obra (status, atualizadoEm)
CREATE INDEX "Obra_status_atualizadoEm_idx" ON "Obra"("status", "atualizadoEm");

-- AddIndex: Obra (geoLatitude, geoLongitude) for PostGIS queries
CREATE INDEX "Obra_geoLatitude_geoLongitude_idx" ON "Obra"("geoLatitude", "geoLongitude");

-- AddIndex: EtapaObra (status, criadoEm) for approval workflow queries
CREATE INDEX "EtapaObra_status_criadoEm_idx" ON "EtapaObra"("status", "criadoEm");

-- AddIndex: EvidenciaEtapa (validada, criadoEm) for recent validated evidence queries
CREATE INDEX "EvidenciaEtapa_validada_criadoEm_idx" ON "EvidenciaEtapa"("validada", "criadoEm");
