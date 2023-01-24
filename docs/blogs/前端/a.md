---
title: 【vue】跨域解决方案之proxyTable
date: 2022-12-28
categories:
- 前端
tags:
- vue
---

````java
/**
 * <p>
 * 分布式锁接口
 * </p>
 *
 * @author lailai
 * @since 2021-09-07
 */
public interface DistributedLocker {
    /**
     * 获取锁，如果锁不可用，则当前线程处于休眠状态，直到获得锁为止。
     *
     * @param lockKey 锁key值
     */
    void lock(String lockKey);

    /**
     * 释放锁
     *
     * @param lockKey 锁key值
     */
    void unlock(String lockKey);

    /**
     * 获取锁,如果锁不可用,则当前线程处于休眠状态,直到获得锁为止。
     * 如果获取到锁后，执行结束后解锁或达到超时时间后会自动释放锁。
     *
     * @param lockKey 锁key值
     * @param timeout 锁释放时间，单位秒
     */
    void lock(String lockKey, int timeout);

    /**
     * 获取锁,如果锁不可用,则当前线程处于休眠状态,直到获得锁为止。
     * 如果获取到锁后，执行结束后解锁或达到超时时间后会自动释放锁。
     *
     * @param lockKey 锁key值
     * @param timeout 锁释放时间
     * @param unit    时间单位
     */
    void lock(String lockKey, int timeout, TimeUnit unit);

    /**
     * 尝试获取锁,获取到立即返回true,未获取到立即返回false。
     *
     * @param lockKey 锁key值
     * @return 是否获取到锁
     */
    boolean tryLock(String lockKey);

    /**
     * 尝试获取锁,在等待时间内获取到锁则返回true,否则返回false,如果获取到锁,则要么执行完后程序释放锁,
     * 要么在给定的超时时间leaseTime后释放锁。
     *
     * @param lockKey   锁key值
     * @param waitTime  等待时间
     * @param leaseTime 释放时间
     * @param unit      时间单位
     */
    boolean tryLock(String lockKey, long waitTime, long leaseTime, TimeUnit unit) throws InterruptedException;

    /**
     * 锁是否被任意一个线程锁持有
     *
     * @param lockKey 锁key值
     */
    boolean isLocked(String lockKey);
}
````
### RedissonDistributedLocker
````

import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * <p>
 * Redisson分布式锁实现类
 * </p>
 *
 * @author lailai
 * @since 2021-09-07
 */
@Component
public class RedissonDistributedLocker implements DistributedLocker {

    @Autowired
    private RedissonClient redissonClient;

    @Override
    public void lock(String lockKey) {
        RLock lock = redissonClient.getLock(lockKey);
        lock.lock();
    }

    @Override
    public void unlock(String lockKey) {
        RLock lock = redissonClient.getLock(lockKey);
        lock.unlock();
    }

    @Override
    public void lock(String lockKey, int leaseTime) {
        RLock lock = redissonClient.getLock(lockKey);
        lock.lock(leaseTime, TimeUnit.SECONDS);
    }

    @Override
    public void lock(String lockKey, int timeout, TimeUnit unit) {
        RLock lock = redissonClient.getLock(lockKey);
        lock.lock(timeout, unit);
    }

    @Override
    public boolean tryLock(String lockKey) {
        RLock lock = redissonClient.getLock(lockKey);
        return lock.tryLock();
    }

    @Override
    public boolean tryLock(String lockKey, long waitTime, long leaseTime, TimeUnit unit) throws InterruptedException {
        RLock lock = redissonClient.getLock(lockKey);
        return lock.tryLock(waitTime, leaseTime, unit);
    }

    @Override
    public boolean isLocked(String lockKey) {
        RLock lock = redissonClient.getLock(lockKey);
        return lock.isLocked();
    }
}
````
