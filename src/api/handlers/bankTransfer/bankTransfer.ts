import { object, query } from '#api/rumble';
import { registerBankTransferAbilities } from './bankTransferPermissions';

registerBankTransferAbilities();

object({ table: 'bankTransfer' });
query({ table: 'bankTransfer' });
