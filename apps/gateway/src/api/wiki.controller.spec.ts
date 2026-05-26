import { WikiController } from './wiki.controller';

describe('Gateway WikiController', () => {
  const req = { headers: { authorization: 'Bearer token' } };
  let apiProxy: Record<string, jest.Mock>;
  let controller: WikiController;

  beforeEach(() => {
    apiProxy = {
      forwardGetRequest: jest.fn(),
      forwardPatchRequest: jest.fn(),
      forwardPostRequest: jest.fn(),
      forwardDeleteRequest: jest.fn(),
    };
    controller = new WikiController(apiProxy);
  });

  it('proxies wiki page reads', () => {
    controller.listPages(req);
    controller.getPage('page_1', req);

    expect(apiProxy.forwardGetRequest).toHaveBeenCalledWith('wiki/pages', 'Bearer token');
    expect(apiProxy.forwardGetRequest).toHaveBeenCalledWith('wiki/pages/page_1', 'Bearer token');
  });

  it('proxies wiki page mutations', () => {
    const body = { title: 'Docs', visibility: 'WORKSPACE' as const };

    controller.createPage(req, body);
    controller.updatePage('page_1', req, { title: 'Updated' });
    controller.deletePage('page_1', req);

    expect(apiProxy.forwardPostRequest).toHaveBeenCalledWith('wiki/pages', body, 'Bearer token');
    expect(apiProxy.forwardPatchRequest).toHaveBeenCalledWith(
      'wiki/pages/page_1',
      { title: 'Updated' },
      'Bearer token',
    );
    expect(apiProxy.forwardDeleteRequest).toHaveBeenCalledWith('wiki/pages/page_1', 'Bearer token');
  });

  it('proxies favorite actions', () => {
    controller.favoritePage('page_1', req);
    controller.unfavoritePage('page_1', req);

    expect(apiProxy.forwardPostRequest).toHaveBeenCalledWith(
      'wiki/pages/page_1/favorite',
      {},
      'Bearer token',
    );
    expect(apiProxy.forwardDeleteRequest).toHaveBeenCalledWith(
      'wiki/pages/page_1/favorite',
      'Bearer token',
    );
  });
});
