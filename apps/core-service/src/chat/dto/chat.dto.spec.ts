import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { CursorPageDto, ListMessagesDto } from './chat.dto';

describe('CursorPageDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
  });
  const metadata = (metatype: ArgumentMetadata['metatype']): ArgumentMetadata => ({
    type: 'body',
    metatype,
    data: undefined,
  });

  it('accepts numeric pagination values from body', async () => {
    await expect(pipe.transform({ limit: 50 }, metadata(CursorPageDto)))
      .resolves.toMatchObject({ limit: 50 });
  });

  it('accepts hidden message list metadata from body', async () => {
    await expect(pipe.transform(
      { parentId: 'message_1', limit: 50 },
      metadata(ListMessagesDto),
    )).resolves.toMatchObject({ parentId: 'message_1', limit: 50 });
  });

  it('rejects invalid limit values', async () => {
    await expect(pipe.transform({ limit: 0 }, metadata(CursorPageDto)))
      .rejects.toThrow('Bad Request Exception');
  });
});
