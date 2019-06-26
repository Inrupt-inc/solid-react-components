import solid from 'solid-auth-client';
import N3 from 'n3';
import solidLdlex from '@solid/query-ldflex';
import unique from 'unique';
import { solidResponse, SolidError } from '@utils';

const PREFIXES = {
  terms: 'https://www.w3.org/ns/solid/terms#',
  schema: 'http://www.w3.org/2000/01/rdf-schema#',
  things: 'https://schema.org/Thing#',
  ns: 'https://www.w3.org/1999/02/22-rdf-syntax-ns#',
  foaf: 'http://xmlns.com/foaf/0.1/',
  acl: 'http://www.w3.org/ns/auth/acl#'
};

export class Notification {
  constructor(owner, inboxRoot, shape) {
    this.shape = shape;
    this.owner = owner;
    this.inboxRoot = inboxRoot;
    this.schema = null;
  }

  hasInbox = async path => {
    const result = await solid.fetch(path, { method: 'GET' });
    return result.ok;
  };
  /**
   * Create inbox container with default permissions
   * @param inboxRoot
   * @param owner
   * @returns {Promise<*>}
   */

  createInbox = async () => {
    try {
      const hasInbox = await this.hasInbox(this.inboxRoot);
      if (!hasInbox) return;
      const termFactory = N3.DataFactory;
      const { namedNode } = termFactory;
      const writer = new N3.Writer({
        prefixes: {
          ns: PREFIXES.ns,
          foaf: PREFIXES.foaf,
          acl: PREFIXES.acl
        },
        format: 'text/turtle'
      });

      writer.addQuad(namedNode('#owner'), namedNode('ns:type'), namedNode('acl:Authorization'));

      writer.addQuad(namedNode('#owner'), namedNode('acl:agent'), namedNode(this.owner));

      writer.addQuad(namedNode('#owner'), namedNode('acl:accessTo'), namedNode('./'));

      writer.addQuad(
        namedNode('#owner'),
        namedNode('acl:mode'),
        namedNode('acl:Read, acl:Write, acl:Control')
      );

      writer.addQuad(namedNode('#public'), namedNode('ns:type'), namedNode('acl:Authorization'));

      writer.addQuad(
        namedNode('#public'),
        namedNode('acl:agentClass'),
        namedNode('http://xmlns.com/foaf/0.1/Agent')
      );

      writer.addQuad(namedNode('#public'), namedNode('acl:accessTo'), namedNode('./'));

      writer.addQuad(namedNode('#public'), namedNode('acl:mode'), namedNode('acl:Append'));

      await writer.end(async (error, result) => {
        if (error) {
          throw error;
        }
        await solid.fetch(`${this.inboxRoot}/.dummy`, { method: 'PUT' });

        await solid.fetch(`${this.inboxRoot}/.acl`, {
          method: 'PUT',
          body: result,
          contentType: 'text/turtle'
        });
      });
      return solidResponse(200, 'Inbox was created');
    } catch (error) {
      throw new SolidError(error.message, 'Inbox', 500);
    }
  };

  fetchNotificationShape = async file => {
    try {
      const result = await fetch(file);
      const schema = await result.json();

      this.schema = schema;
    } catch (error) {
      throw new SolidError(error.message, 'Fetch Shape', error.status);
    }
  };
  /**
   * create and send notification to user inbox
   * @param inboxRoot
   * @param title
   * @param content
   * @param options
   * @returns {Promise<*>}
   */

  create = async (title, content, options = {}) => {
    try {
      const notificationName = unique();
      const notificationPath = `${this.inboxRoot}/${notificationName}`;
      const termFactory = N3.DataFactory;
      const { namedNode, literal } = termFactory;
      const writer = new N3.Writer({
        prefixes: {
          things: PREFIXES.things,
          schema: PREFIXES.schema,
          terms: PREFIXES.terms
        },
        format: 'text/turtle'
      });

      if (this.schema) {
        await this.fetchNotificationShape(this.shape);
      }
      console.log(this.schema);
      /* writer.addQuad(
        namedNode(notificationPath),
        namedNode(`${PREFIXES.things}id`),
        literal(notificationName)
      ); */

      /* notificationShape.forEach(item => {
        if (item.predicate && item.predicate.includes(':')) {
          writer.addQuad(
            namedNode(notificationPath),
            namedNode(`${PREFIXES[item.predicate.split(':')[0]]}id`),
            literal(notificationName)
          );
        } else {
          throw new SolidError('Schema do not have predicate', 'Notification', 500);
        }
      }); */

      /* options.forEach(custom => {
        writer.addQuad(
          namedNode(custom.subject || notificationPath),
          namedNode(custom.predicate),
          literal(custom.value)
        );
      }); */

      /* await writer.end(async (error, result) => {
        if (error) {
          throw error;
        }
        await solid.fetch(notificationPath, {
          method: 'PUT',
          body: result,
          contentType: 'text/turtle'
        });
      }); */
      return solidResponse(200, 'Notification was created');
    } catch (error) {
      console.log(error);
      throw new SolidError(error.message, 'Notification', error.status);
    }
  };

  markAsRead = async notificationPath => {
    try {
      await solidLdlex[notificationPath][`${PREFIXES.terms}:read`].set(true);

      return solidResponse(200, 'Notification was updated');
    } catch (error) {
      throw new SolidError(error.message, 'Notification', error.status);
    }
  };

  delete = async notificationPath => {
    try {
      await solid.fetch(notificationPath, { method: 'DELETE' });
      return solidResponse(200, 'Notification was deleted it');
    } catch (error) {
      throw new SolidError(error.message, 'Notification Delete', error.status);
    }
  };

  fetch = async () => {
    try {
      const inbox = await solidLdlex[this.inboxRoot];
      let notificationsPath = [];
      let notification = [];

      for await (const notificationPath of inbox) {
        notificationsPath = [...notificationsPath, await notificationPath.value];
      }

      for await (const notificationPath of notificationsPath) {
        const currentNotification = await solidLdlex[notificationPath];
        const title = await currentNotification['schema:title'];

        notification = [...notification, { title: title.value }];
      }

      console.log(notification);
    } catch (error) {
      throw new SolidError(error.message, 'Notification Fetch', error.status);
    }
  };
}
