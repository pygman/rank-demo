import { Injectable } from '@nestjs/common';
import { getIfoContract } from './contract';
import { RankService } from './rank/rank.service';
import { InvitationCenterType } from './generated/InvitationCenter';
import { PosePoolType } from './generated/PosePool';
import * as _ from 'lodash';
import { Rank } from './rank/entities/rank.entity';
import * as process from 'process';
import { Week } from './week/entities/week.entity';
import { WeekService } from './week/week.service';

@Injectable()
export class AppService {
  constructor(
    private readonly rankService: RankService,
    private readonly weekService: WeekService,
  ) {}

  AGGREGATE_BATCH_NUM = 20;

  MIN_STAKE = 5000n * 1000000000000000000n;
  MIN_STAKE_1_2 = 50000n * 1000000000000000000n;

  FLUSH_LOCK = null;

  TOP_LIMIT = 21;

  async flushRank(): Promise<any> {
    const now = new Date();
    const day = Math.floor(now.getTime() / 1000 / 60 / 60 / 24);

    if (this.FLUSH_LOCK) {
      if (now.getTime() - this.FLUSH_LOCK < 1000 * 60 * 20) {
        console.log(`flush lock ${this.FLUSH_LOCK}`);
        return;
      }
      console.log(`flush lock ${this.FLUSH_LOCK} but timeout`);
    }

    this.FLUSH_LOCK = now;

    const dayCount = await this.rankService.countByDate(day);

    if (dayCount > 0) {
      console.log(`rank ${day} already exists ${dayCount}`);
      return;
    }

    const rankMap = new Map<string, Rank>();

    const pMap = new Map<string, string[]>();

    const ifoContract = getIfoContract();
    // const { who: rootInviter } =
    //   await getIfoContract().InvitationCenter.getRootInviter();

    const registeredAccountLength = Number(
      await ifoContract.InvitationCenter.registeredAccountLength(),
    );

    const invitationCenterAddress =
      await ifoContract.InvitationCenter.getAddress();

    const posePoolAddress = await ifoContract.PosePool.getAddress();

    console.log(`registeredAccountLength: ${day} ${registeredAccountLength}`);

    const iis = [...Array(registeredAccountLength).keys()];

    //////////////////////////////////////////////////////////////////////////////////////////////////

    for (const ii of _.chunk(iis, this.AGGREGATE_BATCH_NUM)) {
      console.log(`start fetch ${day} ==> ${ii} <==`);

      const accountAtCalls = ii.map((i) => ({
        target: invitationCenterAddress,
        callData: ifoContract.InvitationCenter.interface.encodeFunctionData(
          'registeredAccountAt',
          [i],
        ),
      }));

      const { returnData: accountAtReturnData } =
        await ifoContract.AggregateCall.aggregateStatic(accountAtCalls);
      const accountIds = accountAtReturnData.map(
        (data) =>
          ifoContract.InvitationCenter.interface.decodeFunctionResult(
            'registeredAccountAt',
            data,
          )[0] as string,
      );

      const inviterRecordsCalls = [...accountIds].map((id) => ({
        target: invitationCenterAddress,
        callData: ifoContract.InvitationCenter.interface.encodeFunctionData(
          'inviterRecords',
          [id],
        ),
      }));

      const { returnData: inviterRecordsReturnData } =
        await ifoContract.AggregateCall.aggregateStatic(inviterRecordsCalls);
      const inviterRecordsList = inviterRecordsReturnData.map(
        (data) =>
          ifoContract.InvitationCenter.interface.decodeFunctionResult(
            'inviterRecords',
            data,
          )[0] as InvitationCenterType.RecordStructOutput,
      );

      const getPersonCalls = [...accountIds].map((id) => ({
        target: posePoolAddress,
        callData: ifoContract.PosePool.interface.encodeFunctionData(
          'getPerson',
          [id],
        ),
      }));

      const { returnData: personReturnData } =
        await ifoContract.AggregateCall.aggregateStatic(getPersonCalls);
      const personList = personReturnData.map(
        (data) =>
          ifoContract.PosePool.interface.decodeFunctionResult(
            'getPerson',
            data,
          )[0] as PosePoolType.PersonStructOutput,
      );

      ii.forEach((i, index) => {
        const rank = new Rank();
        rank.address = inviterRecordsList[index].who;
        rank.inviter = inviterRecordsList[index].inviter;
        rank.stake = personList[index].stakedSourceAmount;
        rank.bonus1 = personList[index].bonus1;
        rank.bonus2 = personList[index].bonus2;
        rank.date = day;

        console.log(
          `fetch ${day} ${i}: ${rank.address} ${rank.inviter} ${rank.stake} ${rank.bonus1} ${rank.bonus2}`,
        );

        rankMap.set(rank.address, rank);

        const p = pMap.get(rank.inviter);
        if (p) {
          p.push(rank.address);
        } else {
          pMap.set(rank.inviter, [rank.address]);
        }
      });
      console.log(`end fetch ${day} ==> ${ii} <==`);
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////

    const calcRank = (address: string) => {
      const rank = rankMap.get(address);
      if (!rank) return { s1: 0n, s2: 0n, s0: 0n };
      if (rank.stake0 === undefined) {
        const cs = pMap.get(address);
        if (cs && cs.length > 0) {
          const ss = cs
            .map((a) => calcRank(a))
            .reduce((acc, b) => ({
              s1: acc.s1 + b.s1,
              s2: acc.s2 + b.s2,
              s0: acc.s0 + b.s0,
            }));
          rank.stake1 = ss.s1;
          rank.stake2 = ss.s2;
          rank.stake0 = ss.s0;
        } else {
          rank.stake1 = 0n;
          rank.stake2 = 0n;
          rank.stake0 = 0n;
        }
      }
      return {
        s1: rank.stake as bigint,
        s2: rank.stake1 as bigint,
        s0: (rank.stake as bigint) + (rank.stake0 as bigint),
      };
    };

    pMap.forEach((value, key) => {
      calcRank(key);
    });

    console.log(`start save db ${day}`);
    for (const ranks of _.chunk(
      [...rankMap.values()],
      this.AGGREGATE_BATCH_NUM,
    )) {
      ranks.forEach((rank) => {
        rank.stake = rank.stake.toString();
        rank.vip =
          rank.stake >= this.MIN_STAKE &&
          rank.stake1 + rank.stake2 >= this.MIN_STAKE_1_2
            ? 1
            : 0;
        rank.stake1 = rank.stake1.toString();
        rank.stake2 = rank.stake2.toString();
        rank.stake0 = rank.stake0.toString();
        rank.bonus1 = rank.bonus1.toString();
        rank.bonus2 = rank.bonus2.toString();
      });
      await this.rankService.save(ranks);
      process.stdout.write(`.`);
    }
    console.log(`\nend save db ${day}`);

    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////

    const wDay = now.getDay();
    const sunday = wDay === 0 ? day - wDay - 7 : day - wDay;

    const sundayRanks = await this.rankService.findByDate(sunday);
    const sundayRankMap = new Map<string, Rank>();
    sundayRanks.forEach((rank) => {
      sundayRankMap.set(rank.address, rank);
    });

    const weeks = [...rankMap.values()]
      .filter((rank) => rank.vip > 0)
      .map((rank) => {
        const week = new Week();
        week.address = rank.address;
        week.stake = rank.stake;
        week.stake1 = rank.stake1;
        week.stake2 = rank.stake2;
        week.stake0 = rank.stake0;
        week.vip = rank.vip;
        const sundayRank = sundayRankMap.get(rank.address);
        if (sundayRank) {
          week.week_stake = BigInt(rank.stake) - BigInt(sundayRank.stake);
          week.week_stake1 = BigInt(rank.stake1) - BigInt(sundayRank.stake1);
          week.week_stake2 = BigInt(rank.stake2) - BigInt(sundayRank.stake2);
          week.week_stake0 = BigInt(rank.stake0) - BigInt(sundayRank.stake0);
        } else {
          week.week_stake = BigInt(rank.stake);
          week.week_stake1 = BigInt(rank.stake1);
          week.week_stake2 = BigInt(rank.stake2);
          week.week_stake0 = BigInt(rank.stake0);
        }
        week.bonus1 = rank.bonus1;
        week.bonus2 = rank.bonus2;
        week.date = rank.date;
        return week;
      });

    /*
    // sort by only this week stake
    weeks.sort((a, b) => {
      const a_stake =
        BigInt(a.week_stake) + BigInt(a.week_stake1) + BigInt(a.week_stake2);
      const b_stake =
        BigInt(b.week_stake) + BigInt(b.week_stake1) + BigInt(b.week_stake2);
      if (a_stake > b_stake) return -1;
      if (a_stake < b_stake) return 1;
      return 0;
    });
     */

    // sort by total stake
    weeks.sort((a, b) => {
      const a_stake = BigInt(a.stake) + BigInt(a.stake1) + BigInt(a.stake2);
      const b_stake = BigInt(b.stake) + BigInt(b.stake1) + BigInt(b.stake2);
      if (a_stake > b_stake) return -1;
      if (a_stake < b_stake) return 1;
      return 0;
    });

    weeks.forEach((week, index) => {
      week.rank = index + 1;
      week.week_stake = week.week_stake.toString();
      week.week_stake1 = week.week_stake1.toString();
      week.week_stake2 = week.week_stake2.toString();
      week.week_stake0 = week.week_stake0.toString();
    });

    console.log(`start save week ${day}`);
    for (const ws of _.chunk(weeks, this.AGGREGATE_BATCH_NUM)) {
      await this.weekService.save(ws);
      process.stdout.write(`.`);
    }
    console.log(`\nend save week ${day}`);
    this.FLUSH_LOCK = null;

    return {};
  }

  async getWeeklyRank(): Promise<Week[]> {
    const now = new Date();
    let day = Math.floor(now.getTime() / 1000 / 60 / 60 / 24);

    let dayCount = await this.weekService.countByDate(day);

    if (dayCount < 1) {
      console.log(`week ${day} count: ${dayCount} use -1`);
      day -= 1;
      dayCount = await this.weekService.countByDate(day);
      if (dayCount < 1) {
        console.log(`week ${day} use -1 count: ${dayCount} return null`);
        return [];
      }
    }
    const weeks = await this.weekService.findByDate(day, this.TOP_LIMIT);
    console.log(
      `get weekly rank ${now} day: ${day} count: ${dayCount} return ${weeks.map(
        (w) => w.address,
      )}`,
    );
    return weeks;
  }

  async getStaking(address: string): Promise<Week> {
    const now = new Date();
    let day = Math.floor(now.getTime() / 1000 / 60 / 60 / 24);

    let staking = await this.weekService.findOneByDate(address, day);

    if (!staking) {
      day -= 1;
      staking = await this.weekService.findOneByDate(address, day);
    }

    console.log(
      `get staking address: ${address} ${now} day: ${day} return ${staking?.stake0}`,
    );
    return staking;
  }

  async totalStake(addresses: string[]) {
    const ifoContract = getIfoContract();
    const posePoolAddress = await ifoContract.PosePool.getAddress();

    const totals = await Promise.all(
      _.chunk(addresses, this.AGGREGATE_BATCH_NUM).map(async (addrs) => {
        const getPersonCalls = addrs.map((id) => ({
          target: posePoolAddress,
          callData: ifoContract.PosePool.interface.encodeFunctionData(
            'getPerson',
            [id],
          ),
        }));

        const { returnData: personReturnData } =
          await ifoContract.AggregateCall.aggregateStatic(getPersonCalls);
        const personList = personReturnData.map(
          (data) =>
            ifoContract.PosePool.interface.decodeFunctionResult(
              'getPerson',
              data,
            )[0] as PosePoolType.PersonStructOutput,
        );

        const stake = personList
          .map((p) => p.stakedSourceAmount)
          .reduce((p0, p) => p0 + p);
        return stake;
      }),
    );
    return totals.reduce((t0: bigint, t: bigint) => t0 + t);
  }

  async getInvitees(address: string): Promise<string[]> {
    const ifoContract = getIfoContract();
    const inviteeRecordsLength = Number(
      await ifoContract.InvitationCenter.inviteeRecordsLength(address),
    );

    const invitationCenterAddress =
      await ifoContract.InvitationCenter.getAddress();

    const iis = [...Array(inviteeRecordsLength).keys()];

    const allChunk = await Promise.all(
      _.chunk(iis, this.AGGREGATE_BATCH_NUM).map(async (ii) => {
        const accountAtCalls = ii.map((i) => ({
          target: invitationCenterAddress,
          callData: ifoContract.InvitationCenter.interface.encodeFunctionData(
            'inviteeRecordsAt',
            [address, i],
          ),
        }));

        const { returnData: accountAtReturnData } =
          await ifoContract.AggregateCall.aggregateStatic(accountAtCalls);
        return accountAtReturnData.map(
          (data) =>
            ifoContract.InvitationCenter.interface.decodeFunctionResult(
              'inviteeRecordsAt',
              data,
            )[0] as string,
        );
      }),
    );

    const accountIds = _.flatten(allChunk);
    return accountIds;
  }

  async getStake(address: string) {
    const ifoContract = getIfoContract();
    const person = await ifoContract.PosePool.getPerson(address);
    return person.stakedSourceAmount.toString();
  }

  async getStake1(address: string) {
    const addresses = await this.getInvitees(address);
    return this.totalStake(addresses);
  }

  async getStake2(address: string) {
    const addresses = await this.getInvitees(address);
    const allAddresses = _.flatten(
      await Promise.all(
        addresses.map(async (addrs) => await this.getInvitees(addrs)),
      ),
    );
    return await this.totalStake(allAddresses);
  }
}
