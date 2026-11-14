import { Controller, Get, Inject } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AppService } from './app.service'

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(@Inject(AppService) private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  getHealth() {
    return this.appService.getHealth()
  }

  @Get('versions')
  @ApiOperation({ summary: 'Notes de version du projet (quoi de neuf)' })
  getVersions() {
    return this.appService.getVersions()
  }
}
