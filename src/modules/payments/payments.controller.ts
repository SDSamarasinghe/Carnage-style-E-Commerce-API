import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { Public } from '@/common/decorators/public.decorator';

import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('stripe/create-intent')
  @ApiOperation({ summary: 'Create a Stripe PaymentIntent for a cart total' })
  createIntent(@Req() req: Request & { user: { id: string } }) {
    return this.paymentsService.createPaymentIntent(req.user.id);
  }

  @Public()
  @Post('stripe/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook — signature-verified' })
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody ?? Buffer.from('');
    return this.paymentsService.handleWebhook(rawBody, signature);
  }
}
