import { countQuery, object, query } from '#api/rumble';
import { registerBankTransferAbilities } from './bankTransferPermissions';

registerBankTransferAbilities();

object({ table: 'bankTransfer' });
query({ table: 'bankTransfer' });
// `bankTransfersCount(where)`: how many payments the sync settled, which the payments page shows
countQuery({ table: 'bankTransfer' });
