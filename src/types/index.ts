import { AggregateCall, InvitationCenter, PosePool } from '../generated';

export type NameMapping = {
  AggregateCall: string;
  InvitationCenter: string;
  PosePool: string;
};

export type IfoContract = {
  AggregateCall: AggregateCall;
  InvitationCenter: InvitationCenter;
  PosePool: PosePool;
};
