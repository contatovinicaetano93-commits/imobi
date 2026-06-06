import { Module } from "@nestjs/common";
import { MarketplaceController } from "./marketplace.controller";
import { MarketplaceService } from "./marketplace.service";
import { ParceirosModule } from "../parceiros/parceiros.module";

@Module({
  imports: [ParceirosModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
})
export class MarketplaceModule {}
